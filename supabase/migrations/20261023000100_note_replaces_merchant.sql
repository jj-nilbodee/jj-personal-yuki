-- One free-text field per entry: the note. The separate payee field ("Paid to"
-- / "From") is gone; slips now put the payee or payer Gemini reads into the
-- note, and the note is what the transaction list shows as the entry's name.
--
-- Existing payees move into the note, in front of any note already there.
-- suggest_category() now matches on the note: a slip from a shop the user
-- kept the read name for still gets last time's category; a note they
-- rewrote freely just falls back to the model's pick.

update public.transactions
set note = case
  when nullif(trim(note), '') is null or lower(trim(note)) = lower(trim(merchant)) then trim(merchant)
  else trim(merchant) || ' · ' || note
end
where nullif(trim(merchant), '') is not null;

update public.recurring_rules
set note = case
  when nullif(trim(note), '') is null or lower(trim(note)) = lower(trim(merchant)) then trim(merchant)
  else trim(merchant) || ' · ' || note
end
where nullif(trim(merchant), '') is not null;

-- Slip drafts still waiting for review keep their suggestions under the new key.
update public.transactions t
set extraction = jsonb_set(t.extraction, '{suggested}', (
  select jsonb_object_agg(k, case when v ? 'merchant' then (v - 'merchant') || jsonb_build_object('note', v -> 'merchant') else v end)
  from jsonb_each(t.extraction -> 'suggested') e(k, v)
))
where t.status <> 'confirmed'
  and jsonb_typeof(t.extraction -> 'suggested') = 'object'
  and t.extraction -> 'suggested' <> '{}'::jsonb;

alter table public.transactions drop column merchant;
alter table public.recurring_rules drop column merchant;

drop function public.suggest_category(text, public.txn_type);
-- Most recent category the user picked for an entry with this note. Used to
-- pre-fill extracted slips before falling back to the model's guess.
create function public.suggest_category(p_note text, p_type public.txn_type default 'expense')
returns uuid language sql stable security invoker set search_path = '' as $$
  select t.category_id from public.transactions t
  where t.status = 'confirmed' and t.type = p_type and t.category_id is not null
    and lower(trim(t.note)) = lower(trim(p_note))
  order by t.date desc, t.created_at desc
  limit 1
$$;

drop function public.upcoming_recurring(int);
create function public.upcoming_recurring(p_days int default 14)
returns table (rule_id uuid, due_date date, type public.txn_type, amount numeric,
               note text, category_id uuid, account_id uuid, to_account_id uuid)
language sql stable security invoker set search_path = '' as $$
  with recursive today as (select (now() at time zone 'Asia/Bangkok')::date as d),
  occ as (
    select r.id, r.next_run_date as due, r.frequency, r.anchor_day
    from public.recurring_rules r where r.active
    union all
    select occ.id, public.next_occurrence(occ.due, occ.frequency, occ.anchor_day), occ.frequency, occ.anchor_day
    from occ, today where occ.due < today.d + p_days
  )
  select r.id, occ.due, r.type, r.amount, r.note, r.category_id, r.account_id, r.to_account_id
  from occ join public.recurring_rules r on r.id = occ.id, today
  where occ.due >= today.d and occ.due < today.d + p_days
  order by occ.due, r.amount desc
$$;

create or replace function public.run_due_recurring(p_today date default (now() at time zone 'Asia/Bangkok')::date)
returns int language plpgsql security definer set search_path = '' as $$
declare
  r public.recurring_rules;
  created int := 0;
begin
  for r in
    select * from public.recurring_rules
    where active and next_run_date <= p_today
    for update skip locked
  loop
    while r.next_run_date <= p_today loop
      insert into public.transactions
        (user_id, account_id, to_account_id, category_id, recurring_rule_id, type, amount, date, note, for_next_month, status, source)
      values
        (r.user_id, r.account_id, r.to_account_id, r.category_id, r.id, r.type, r.amount, r.next_run_date, r.note, r.for_next_month, 'confirmed', 'recurring');
      created := created + 1;
      r.next_run_date := public.next_occurrence(r.next_run_date, r.frequency, r.anchor_day);
    end loop;
    update public.recurring_rules set next_run_date = r.next_run_date where id = r.id;
  end loop;
  return created;
end $$;

create or replace function public.make_recurring(
  p_transaction_id uuid,
  p_frequency public.recur_frequency,
  p_anchor_day int default null,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  t public.transactions;
  anchor int;
  next_d date;
  r public.recurring_rules;
begin
  select * into t from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'entry not found'; end if;
  if t.status <> 'confirmed' then raise exception 'save the entry before setting it to repeat'; end if;
  if t.recurring_rule_id is not null then raise exception 'this entry already repeats'; end if;

  anchor := coalesce(p_anchor_day, extract(day from t.date)::int);
  if p_frequency <> 'weekly' then
    next_d := date_trunc('month', t.date)::date
      + (least(anchor, extract(day from (date_trunc('month', t.date) + interval '1 month - 1 day'))::int) - 1);
  end if;
  if next_d is null or next_d <= t.date then
    next_d := public.next_occurrence(t.date, p_frequency, anchor);
  end if;
  while next_d < p_today loop
    next_d := public.next_occurrence(next_d, p_frequency, anchor);
  end loop;

  insert into public.recurring_rules
    (type, amount, account_id, to_account_id, category_id, note, for_next_month, frequency, anchor_day, next_run_date)
  values
    (t.type, t.amount, t.account_id, t.to_account_id, t.category_id, t.note, t.for_next_month, p_frequency, anchor, next_d)
  returning * into r;

  update public.transactions set recurring_rule_id = r.id where id = t.id;
  return r;
end $$;

create or replace function public.start_recurring(
  p_entry jsonb,
  p_frequency public.recur_frequency,
  p_anchor_day int default null,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  t public.transactions := jsonb_populate_record(null::public.transactions, p_entry);
  anchor int;
  first_d date;
  keep_balances boolean;
  from_bal numeric;
  to_bal numeric;
  r public.recurring_rules;
begin
  t.date := coalesce(t.date, p_today);
  anchor := coalesce(p_anchor_day, extract(day from t.date)::int);

  if t.date <= p_today then
    keep_balances := exists (select 1 from public.profiles where onboarding_step is not null);
    if keep_balances then
      select b.balance into from_bal from public.account_balances() b where b.id = t.account_id;
      select b.balance into to_bal from public.account_balances() b where b.id = t.to_account_id;
    end if;
    insert into public.transactions (type, amount, account_id, to_account_id, category_id, note, for_next_month, date)
    values (t.type, t.amount, t.account_id, t.to_account_id, t.category_id, t.note, t.for_next_month, t.date)
    returning * into t;
    r := public.make_recurring(t.id, p_frequency, p_anchor_day, p_today);
    if from_bal is not null then perform public.set_account_balance(t.account_id, from_bal); end if;
    if to_bal is not null then perform public.set_account_balance(t.to_account_id, to_bal); end if;
    return r;
  end if;

  first_d := t.date;
  if p_frequency <> 'weekly' then
    -- The anchor day in the entered month, clamped to the month's length.
    first_d := date_trunc('month', t.date)::date
      + (least(anchor, extract(day from (date_trunc('month', t.date) + interval '1 month - 1 day'))::int) - 1);
    if first_d < t.date then first_d := public.next_occurrence(first_d, p_frequency, anchor); end if;
  end if;

  insert into public.recurring_rules
    (type, amount, account_id, to_account_id, category_id, note, for_next_month, frequency, anchor_day, next_run_date)
  values
    (t.type, t.amount, t.account_id, t.to_account_id, t.category_id, t.note, t.for_next_month, p_frequency, anchor, first_d)
  returning * into r;
  return r;
end $$;
