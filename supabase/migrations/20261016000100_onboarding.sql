-- First-use onboarding: Yuki asks what to call the user, where their money
-- lives, when their salary comes in, which bills repeat, and what they want to
-- spend in a month. Everything except the first account can be skipped.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- What Yuki calls the user at his touchpoints (PRD part 3, section 7).
  display_name text check (length(trim(display_name)) between 1 and 40),
  -- One overall monthly spending budget; null means none.
  monthly_budget numeric(14, 2) check (monthly_budget > 0),
  -- The onboarding step still to do; null once onboarding is finished.
  onboarding_step text default 'name' check (onboarding_step in ('name', 'account', 'salary', 'bills', 'budget')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Existing users already use the app; only those without an account go through onboarding.
insert into public.profiles (user_id, onboarding_step)
select u.id, case when exists (select 1 from public.accounts a where a.user_id = u.id) then null else 'name' end
from auth.users u;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.categories (user_id, name, type, icon, is_default) values
    (new.id, 'Food & Dining', 'expense', 'utensils', true),
    (new.id, 'Groceries', 'expense', 'shopping-basket', true),
    (new.id, 'Transport', 'expense', 'bus', true),
    (new.id, 'Rent & Housing', 'expense', 'house', true),
    (new.id, 'Utilities', 'expense', 'plug', true),
    (new.id, 'Shopping', 'expense', 'shopping-bag', true),
    (new.id, 'Health', 'expense', 'heart-pulse', true),
    (new.id, 'Subscriptions', 'expense', 'repeat', true),
    (new.id, 'Transfers to people', 'expense', 'send', true),
    (new.id, 'Other', 'expense', 'circle', true),
    (new.id, 'Salary', 'income', 'briefcase', true),
    (new.id, 'Freelance', 'income', 'laptop', true),
    (new.id, 'Transfers in', 'income', 'download', true),
    (new.id, 'Other income', 'income', 'circle', true);
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Move past an onboarding step, whether it was answered or skipped. Only
-- advances from the step the user is on, so a double submit never skips one.
-- The account step can't be passed without an account: entries need one.
create function public.finish_onboarding_step(p_step text)
returns void language sql security invoker set search_path = '' as $$
  update public.profiles
  set onboarding_step = case p_step
    when 'name' then 'account'
    when 'account' then 'salary'
    when 'salary' then 'bills'
    when 'bills' then 'budget'
  end
  where onboarding_step = p_step
    and (p_step <> 'account' or exists (select 1 from public.accounts))
$$;

-- A monthly salary paid on p_anchor_day (31 = last day of the month) into
-- p_account. If this month's payday has already come and p_already_paid, the
-- payment is logged now so this month's balance is right from the start;
-- otherwise the cron logs it on the next payday. Returns the new rule.
create function public.start_salary(
  p_amount numeric,
  p_anchor_day int,
  p_account uuid,
  p_category uuid default null,
  p_already_paid boolean default false,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  month_start date := date_trunc('month', p_today)::date;
  payday date;
  paid boolean;
  r public.recurring_rules;
begin
  if p_anchor_day not between 1 and 31 then raise exception 'payday must be a day of the month'; end if;
  payday := month_start
    + (least(p_anchor_day, extract(day from (month_start + interval '1 month - 1 day'))::int) - 1);
  paid := p_already_paid and payday <= p_today;

  insert into public.recurring_rules (type, amount, account_id, category_id, frequency, anchor_day, next_run_date)
  values ('income', p_amount, p_account, p_category, 'monthly', p_anchor_day,
          case when paid or payday < p_today then public.next_occurrence(payday, 'monthly', p_anchor_day) else payday end)
  returning * into r;

  if paid then
    insert into public.transactions (type, amount, account_id, category_id, recurring_rule_id, date)
    values ('income', p_amount, p_account, p_category, r.id, payday);
  end if;
  return r;
end $$;

-- Month summary plus the budget: what's left of it this month (negative = over).
create or replace function public.month_summary(p_month date default (now() at time zone 'Asia/Bangkok')::date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select date_trunc('month', p_month)::date as start_d,
           (date_trunc('month', p_month) + interval '1 month')::date as end_d
  ),
  tx as (
    select t.* from public.transactions t, bounds b
    where t.status = 'confirmed' and t.date >= b.start_d and t.date < b.end_d
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
