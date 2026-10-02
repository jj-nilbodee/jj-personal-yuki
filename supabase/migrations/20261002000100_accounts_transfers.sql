-- Transfers between own accounts, per-account balances, and slips that wait
-- for the user to say which way the money went.

-- ---------------------------------------------------------------------------
-- Accounts: balance = opening_balance + confirmed movements. For credit cards
-- the balance is negative while money is owed.
-- ---------------------------------------------------------------------------
alter table public.accounts add column opening_balance numeric(14, 2) not null default 0;

-- Categories describe spending or income; a transfer never has one.
alter table public.categories add constraint categories_not_transfer check (type <> 'transfer');

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
-- A slip draft has no type until the user says whether money went out, came
-- in, or moved between their own accounts. Confirmed rows always have one.
alter table public.transactions alter column type drop not null;
alter table public.transactions add constraint transactions_confirmed_type
  check (status <> 'confirmed' or type is not null);

alter table public.transactions add column to_account_id uuid;
alter table public.transactions add constraint transactions_to_account_fkey
  foreign key (to_account_id, user_id) references public.accounts (id, user_id) on delete set null (to_account_id);
-- Only transfers have a destination account, and transfers have no category.
alter table public.transactions add constraint transactions_transfer_shape
  check (case when type = 'transfer' then category_id is null else to_account_id is null end);
alter table public.transactions add constraint transactions_transfer_accounts
  check (type is distinct from 'transfer' or status <> 'confirmed'
         or (account_id is not null and to_account_id is not null and account_id <> to_account_id));
create index transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;

-- ---------------------------------------------------------------------------
-- Recurring rules can be transfers too (e.g. a monthly move into savings).
-- ---------------------------------------------------------------------------
alter table public.recurring_rules add column to_account_id uuid;
alter table public.recurring_rules add constraint recurring_rules_to_account_fkey
  foreign key (to_account_id, user_id) references public.accounts (id, user_id) on delete set null (to_account_id);
alter table public.recurring_rules add constraint recurring_rules_transfer_shape
  check (case when type = 'transfer'
              then category_id is null and account_id is not null and to_account_id is not null and account_id <> to_account_id
              else to_account_id is null end);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Current balance of every account. Only confirmed entries count.
create function public.account_balances()
returns table (id uuid, name text, type public.account_type, bank_code text, archived boolean, balance numeric)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.name, a.type, a.bank_code, a.archived, a.opening_balance + coalesce(m.movement, 0)
  from public.accounts a
  left join lateral (
    select sum(case when t.to_account_id = a.id or t.type = 'income' then t.amount else -t.amount end) as movement
    from public.transactions t
    where t.status = 'confirmed' and (t.account_id = a.id or t.to_account_id = a.id)
  ) m on true
  order by a.name
$$;

-- Set what an account holds right now. Stores the opening balance that makes
-- the computed balance come out to p_balance, so past entries stay as they are.
create function public.set_account_balance(p_account uuid, p_balance numeric)
returns void language sql security invoker set search_path = '' as $$
  update public.accounts a
  set opening_balance = a.opening_balance + p_balance - b.balance
  from public.account_balances() b
  where a.id = p_account and b.id = a.id
$$;

drop function public.upcoming_recurring(int);
create function public.upcoming_recurring(p_days int default 14)
returns table (rule_id uuid, due_date date, type public.txn_type, amount numeric, merchant text,
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
  select r.id, occ.due, r.type, r.amount, r.merchant, r.note, r.category_id, r.account_id, r.to_account_id
  from occ join public.recurring_rules r on r.id = occ.id, today
  where occ.due >= today.d and occ.due < today.d + p_days
  order by occ.due, r.amount desc
$$;

-- Transfers never have a category, so they don't count as uncategorized.
create or replace function public.protective_nudges()
returns table (kind text, count bigint)
language sql stable security invoker set search_path = '' as $$
  select 'uncategorized', count(*) from public.transactions
    where status = 'confirmed' and category_id is null and type <> 'transfer'
    having count(*) >= 5
  union all
  select 'unreviewed', count(*) from public.transactions
    where status = 'needs_review' and created_at < now() - interval '3 days'
    having count(*) >= 1
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
        (user_id, account_id, to_account_id, category_id, recurring_rule_id, type, amount, date, merchant, note, status, source)
      values
        (r.user_id, r.account_id, r.to_account_id, r.category_id, r.id, r.type, r.amount, r.next_run_date, r.merchant, r.note, 'confirmed', 'recurring');
      created := created + 1;
      r.next_run_date := public.next_occurrence(r.next_run_date, r.frequency, r.anchor_day);
    end loop;
    update public.recurring_rules set next_run_date = r.next_run_date where id = r.id;
  end loop;
  return created;
end $$;
