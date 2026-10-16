-- Income that pays for the following month, e.g. a salary paid on the last day
-- of October that the user lives on in November. The entry keeps its real date
-- (account balances and the transaction list stay true to the bank), but
-- monthly totals count it in the month after.

alter table public.transactions add column for_next_month boolean not null default false;
alter table public.transactions add constraint transactions_next_month_income
  check (not for_next_month or type = 'income');
-- The month an entry counts toward in monthly totals.
alter table public.transactions add column ledger_month date generated always as (
  (date_trunc('month', date::timestamp) + case when for_next_month then interval '1 month' else interval '0 months' end)::date
) stored;
create index transactions_user_ledger_month_idx on public.transactions (user_id, ledger_month);

alter table public.recurring_rules add column for_next_month boolean not null default false;
alter table public.recurring_rules add constraint recurring_rules_next_month_income
  check (not for_next_month or type = 'income');

-- ---------------------------------------------------------------------------
-- Functions: count by ledger_month, and carry the flag from rules to entries.
-- ---------------------------------------------------------------------------

create or replace function public.month_summary(p_month date default (now() at time zone 'Asia/Bangkok')::date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with bounds as (select date_trunc('month', p_month)::date as start_d),
  tx as (
    select t.* from public.transactions t, bounds b
    where t.status = 'confirmed' and t.ledger_month = b.start_d
  ),
  by_cat as (
    select tx.type, c.id, coalesce(c.name, 'Uncategorized') as name, coalesce(c.icon, 'circle') as icon,
           sum(tx.amount) as total, count(*) as count
    from tx left join public.categories c on c.id = tx.category_id
    where tx.type in ('expense', 'income')
    group by tx.type, c.id, c.name, c.icon
  ),
  spent as (select coalesce(sum(amount), 0) as total from tx where type = 'expense'),
  budget as (select monthly_budget as amount from public.profiles)
  select jsonb_build_object(
    'month', (select start_d from bounds),
    'income', coalesce((select sum(amount) from tx where type = 'income'), 0),
    'expense', (select total from spent),
    'count', (select count(*) from tx),
    'budget', (select amount from budget),
    'budget_left', (select budget.amount - spent.total from budget, spent),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'icon', icon, 'total', total, 'count', count) order by total desc)
      from by_cat where type = 'expense'
    ), '[]'::jsonb),
    'income_categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'icon', icon, 'total', total, 'count', count) order by total desc)
      from by_cat where type = 'income'
    ), '[]'::jsonb)
  )
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
        (user_id, account_id, to_account_id, category_id, recurring_rule_id, type, amount, date, merchant, note, for_next_month, status, source)
      values
        (r.user_id, r.account_id, r.to_account_id, r.category_id, r.id, r.type, r.amount, r.next_run_date, r.merchant, r.note, r.for_next_month, 'confirmed', 'recurring');
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
    (type, amount, account_id, to_account_id, category_id, merchant, note, for_next_month, frequency, anchor_day, next_run_date)
  values
    (t.type, t.amount, t.account_id, t.to_account_id, t.category_id, t.merchant, t.note, t.for_next_month, p_frequency, anchor, next_d)
  returning * into r;

  update public.transactions set recurring_rule_id = r.id where id = t.id;
  return r;
end $$;

-- start_salary gains p_for_next_month. "Already paid" logs every payday that
-- has already come and pays for this month or later: this month's payday if
-- it has passed and, for a salary that pays for the following month, also
-- last month's payday (which pays for this month).
drop function public.start_salary(numeric, int, uuid, uuid, boolean, date);
create function public.start_salary(
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

  foreach d in array paid loop
    insert into public.transactions (type, amount, account_id, category_id, recurring_rule_id, for_next_month, date)
    values ('income', p_amount, p_account, p_category, r.id, p_for_next_month, d);
  end loop;
  return r;
end $$;
