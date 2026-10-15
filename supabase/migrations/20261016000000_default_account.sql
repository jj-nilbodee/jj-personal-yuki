-- Every confirmed entry and recurring rule belongs to an account. Each user has
-- one default account that new entries start on: their first account, which
-- they name on first use (new users no longer get an automatic "Cash").

alter table public.accounts add column is_default boolean not null default false;

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Users with entries but no account at all get the Cash account sign-up used to create.
insert into public.accounts (user_id, name, type)
select distinct x.user_id, 'Cash', 'cash'::public.account_type
from (
  select user_id from public.transactions where status = 'confirmed' and account_id is null
  union
  select user_id from public.recurring_rules where account_id is null
) x
where not exists (select 1 from public.accounts a where a.user_id = x.user_id);

-- The first account each user created becomes their default (a visible one if they have it).
update public.accounts a set is_default = true, archived = false
from (
  select distinct on (user_id) id from public.accounts order by user_id, archived, created_at, id
) first
where a.id = first.id;

update public.transactions t set account_id = a.id
from public.accounts a
where t.status = 'confirmed' and t.account_id is null and a.user_id = t.user_id and a.is_default;

update public.recurring_rules r set account_id = a.id
from public.accounts a
where r.account_id is null and a.user_id = r.user_id and a.is_default;

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------
create unique index accounts_one_default on public.accounts (user_id) where is_default;
alter table public.accounts add constraint accounts_default_visible check (not (is_default and archived));

alter table public.transactions add constraint transactions_confirmed_account
  check (status <> 'confirmed' or account_id is not null);
alter table public.recurring_rules add constraint recurring_rules_account
  check (account_id is not null);

-- An account that entries or rules still point at can't be deleted out from under them.
alter table public.transactions drop constraint transactions_account_id_user_id_fkey;
alter table public.transactions add constraint transactions_account_id_user_id_fkey
  foreign key (account_id, user_id) references public.accounts (id, user_id);
alter table public.recurring_rules drop constraint recurring_rules_account_id_user_id_fkey;
alter table public.recurring_rules add constraint recurring_rules_account_id_user_id_fkey
  foreign key (account_id, user_id) references public.accounts (id, user_id);

-- A user's first account becomes their default.
create function public.first_account_is_default() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.accounts where user_id = new.user_id and is_default) then
    new.is_default := true;
  end if;
  return new;
end $$;

create trigger accounts_first_is_default before insert on public.accounts
  for each row execute function public.first_account_is_default();

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Make another of the caller's visible accounts the default.
create function public.set_default_account(p_account uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.accounts where id = p_account and not archived) then
    raise exception 'account not found';
  end if;
  -- Two statements: the one-default index is checked row by row.
  update public.accounts set is_default = false where is_default and id <> p_account;
  update public.accounts set is_default = true where id = p_account;
end $$;

drop function public.account_balances();
create function public.account_balances()
returns table (id uuid, name text, type public.account_type, bank_code text, archived boolean, is_default boolean, balance numeric)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.name, a.type, a.bank_code, a.archived, a.is_default, a.opening_balance + coalesce(m.movement, 0)
  from public.accounts a
  left join lateral (
    select sum(case when t.to_account_id = a.id or t.type = 'income' then t.amount else -t.amount end) as movement
    from public.transactions t
    where t.status = 'confirmed' and (t.account_id = a.id or t.to_account_id = a.id)
  ) m on true
  order by a.name
$$;

-- New users name their first account themselves on first use.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
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
