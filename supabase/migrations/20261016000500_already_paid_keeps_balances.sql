-- Payments logged as "already paid" (start_salary, start_recurring) happened
-- before the user typed in their account balance during onboarding, so that
-- balance already includes them. Logging them now keeps each account's
-- balance where it was (moving opening_balance, like set_account_balance)
-- instead of counting the money a second time.

create or replace function public.start_salary(
  p_amount numeric,
  p_anchor_day int,
  p_account uuid,
  p_category uuid default null,
  p_already_paid boolean default false,
  p_for_next_month boolean default false,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  month_start date := date_trunc('month', p_today)::date;
  payday date;  -- this month's payday
  paid date[] := '{}';
  d date;
  r public.recurring_rules;
  bal numeric;
begin
  if p_anchor_day not between 1 and 31 then raise exception 'payday must be a day of the month'; end if;
  payday := month_start
    + (least(p_anchor_day, extract(day from (month_start + interval '1 month - 1 day'))::int) - 1);
  if p_already_paid and p_for_next_month then
    -- Last month's payday, clamped to that month's length.
    paid := paid || ((month_start - interval '1 month')::date
      + (least(p_anchor_day, extract(day from (month_start - interval '1 day'))::int) - 1));
  end if;
  if p_already_paid and payday <= p_today then
    paid := paid || payday;
  end if;

  -- A payday already logged or already past is not repeated (no back-fill).
  insert into public.recurring_rules (type, amount, account_id, category_id, for_next_month, frequency, anchor_day, next_run_date)
  values ('income', p_amount, p_account, p_category, p_for_next_month, 'monthly', p_anchor_day,
          case when payday = any (paid) or payday < p_today then public.next_occurrence(payday, 'monthly', p_anchor_day) else payday end)
  returning * into r;

  select b.balance into bal from public.account_balances() b where b.id = p_account;
  foreach d in array paid loop
    insert into public.transactions (type, amount, account_id, category_id, recurring_rule_id, for_next_month, date)
    values ('income', p_amount, p_account, p_category, r.id, p_for_next_month, d);
  end loop;
  if bal is not null then perform public.set_account_balance(p_account, bal); end if;
  return r;
end $$;

create or replace function public.start_recurring(
  p_rule jsonb,
  p_already_paid boolean default false,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  r public.recurring_rules := jsonb_populate_record(null::public.recurring_rules, p_rule);
  last_logged date := case when p_already_paid then p_today else p_today - 1 end;
  paid date[] := '{}';
  d date;
  from_bal numeric;
  to_bal numeric;
begin
  if r.next_run_date < date_trunc('month', p_today)::date then
    raise exception 'the first due date can''t be before this month';
  end if;
  while r.next_run_date <= last_logged loop
    if p_already_paid then paid := paid || r.next_run_date; end if;
    r.next_run_date := public.next_occurrence(r.next_run_date, r.frequency, r.anchor_day);
  end loop;

  insert into public.recurring_rules
    (type, amount, account_id, to_account_id, category_id, merchant, note, for_next_month, frequency, anchor_day, next_run_date)
  values
    (r.type, r.amount, r.account_id, r.to_account_id, r.category_id, r.merchant, r.note, r.for_next_month, r.frequency, r.anchor_day, r.next_run_date)
  returning * into r;

  select b.balance into from_bal from public.account_balances() b where b.id = r.account_id;
  select b.balance into to_bal from public.account_balances() b where b.id = r.to_account_id;
  foreach d in array paid loop
    insert into public.transactions
      (type, amount, account_id, to_account_id, category_id, recurring_rule_id, merchant, note, for_next_month, date)
    values
      (r.type, r.amount, r.account_id, r.to_account_id, r.category_id, r.id, r.merchant, r.note, r.for_next_month, d);
  end loop;
  if from_bal is not null then perform public.set_account_balance(r.account_id, from_bal); end if;
  if to_bal is not null then perform public.set_account_balance(r.to_account_id, to_bal); end if;
  return r;
end $$;
