-- Phase 1 core schema (docs/prd/part-2-technical.md, section 4).
-- Every table keys off user_id and is locked down by RLS. Child rows reference
-- accounts/categories through (id, user_id) composite keys, so a row can never
-- point at another user's account or category even if the client sends one.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.account_type as enum ('cash', 'bank', 'card', 'e_wallet');
create type public.txn_type as enum ('expense', 'income');
create type public.txn_source as enum ('manual', 'qr', 'ocr', 'recurring');
-- processing: slip uploaded, extraction running
-- needs_review: extraction finished (or failed); user confirms or edits
-- confirmed: a real ledger entry that counts toward totals
create type public.txn_status as enum ('processing', 'needs_review', 'confirmed');
create type public.recur_frequency as enum ('weekly', 'monthly', 'yearly');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  type public.account_type not null,
  bank_code text,               -- 3-digit Thai bank code, e.g. '004' (KBank)
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  type public.txn_type not null,
  icon text not null default 'circle',  -- lucide icon name
  is_default boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, type, name)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.txn_type not null default 'expense',
  amount numeric(12, 2) not null check (amount > 0),
  account_id uuid,
  category_id uuid,
  merchant text,
  note text,
  frequency public.recur_frequency not null default 'monthly',
  -- Anchor day of month for monthly/yearly rules, so a rule set on the 31st
  -- lands on the last day of shorter months and returns to the 31st after.
  anchor_day int not null check (anchor_day between 1 and 31),
  next_run_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete set null (account_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid,
  category_id uuid,
  recurring_rule_id uuid,
  type public.txn_type not null default 'expense',
  amount numeric(12, 2) check (amount > 0),
  date date not null default (now() at time zone 'Asia/Bangkok')::date,
  merchant text,                -- payee / payer / shop name
  note text,
  status public.txn_status not null default 'confirmed',
  source public.txn_source not null default 'manual',
  slip_path text,               -- object path in the private 'slips' bucket
  bank_ref text,                -- transaction reference from the slip QR (or OCR)
  sending_bank_code text,
  extraction jsonb,             -- raw QR / Gemini output, kept for auditability
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A confirmed entry always has an amount; drafts may not have one yet.
  check (status <> 'confirmed' or amount is not null),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete set null (account_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (recurring_rule_id, user_id) references public.recurring_rules (id, user_id) on delete set null (recurring_rule_id)
);

-- Duplicate-slip prevention: one ledger row per bank reference per user.
create unique index transactions_user_bank_ref_key
  on public.transactions (user_id, bank_ref) where bank_ref is not null;
create index transactions_user_date_idx on public.transactions (user_id, date desc, created_at desc);
create index transactions_user_merchant_idx on public.transactions (user_id, lower(merchant)) where merchant is not null;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger transactions_touch before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.transactions enable row level security;

create policy "own accounts" on public.accounts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own categories" on public.categories for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own recurring rules" on public.recurring_rules for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own transactions" on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Slip storage: private bucket, objects live under '{user_id}/...'
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slips', 'slips', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "own slips read" on storage.objects for select to authenticated
  using (bucket_id = 'slips' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own slips insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'slips' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own slips delete" on storage.objects for delete to authenticated
  using (bucket_id = 'slips' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- New-user defaults: smart default categories and a Cash account
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
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
  insert into public.accounts (user_id, name, type) values (new.id, 'Cash', 'cash');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Business logic lives here (not in React) so a future native client can
-- call the same functions (docs/prd/part-2-technical.md, section 1a).
-- All reader functions are SECURITY INVOKER: RLS scopes them to the caller.
-- ---------------------------------------------------------------------------

-- Advance a recurring date by one period, honouring the anchor day.
create function public.next_occurrence(p_from date, p_frequency public.recur_frequency, p_anchor_day int)
returns date language sql immutable as $$
  select case p_frequency
    when 'weekly' then p_from + 7
    else (
      with m as (
        select date_trunc('month', p_from + case p_frequency when 'monthly' then interval '1 month' else interval '1 year' end)::date as first
      )
      select first + (least(p_anchor_day, extract(day from (first + interval '1 month - 1 day'))::int) - 1)
      from m
    )
  end
$$;

-- Month summary for the dashboard. Only confirmed entries count.
create function public.month_summary(p_month date default (now() at time zone 'Asia/Bangkok')::date)
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
    select c.id, coalesce(c.name, 'Uncategorized') as name, coalesce(c.icon, 'circle') as icon,
           sum(tx.amount) as total, count(*) as count
    from tx left join public.categories c on c.id = tx.category_id
    where tx.type = 'expense'
    group by c.id, c.name, c.icon
    order by total desc
  )
  select jsonb_build_object(
    'month', (select start_d from bounds),
    'income', coalesce((select sum(amount) from tx where type = 'income'), 0),
    'expense', coalesce((select sum(amount) from tx where type = 'expense'), 0),
    'count', (select count(*) from tx),
    'categories', coalesce((select jsonb_agg(to_jsonb(by_cat) order by by_cat.total desc) from by_cat), '[]'::jsonb)
  )
$$;

-- Upcoming recurring entries in the next p_days. Computed, never persisted:
-- the cron job creates the real row on the due date.
create function public.upcoming_recurring(p_days int default 14)
returns table (rule_id uuid, due_date date, type public.txn_type, amount numeric, merchant text,
               note text, category_id uuid, account_id uuid)
language sql stable security invoker set search_path = '' as $$
  with recursive today as (select (now() at time zone 'Asia/Bangkok')::date as d),
  occ as (
    select r.id, r.next_run_date as due, r.frequency, r.anchor_day
    from public.recurring_rules r where r.active
    union all
    select occ.id, public.next_occurrence(occ.due, occ.frequency, occ.anchor_day), occ.frequency, occ.anchor_day
    from occ, today where occ.due < today.d + p_days
  )
  select r.id, occ.due, r.type, r.amount, r.merchant, r.note, r.category_id, r.account_id
  from occ join public.recurring_rules r on r.id = occ.id, today
  where occ.due >= today.d and occ.due < today.d + p_days
  order by occ.due, r.amount desc
$$;

-- Most recent category the user picked for this merchant. Used to pre-fill
-- extracted slips before falling back to the model's guess.
create function public.suggest_category(p_merchant text, p_type public.txn_type default 'expense')
returns uuid language sql stable security invoker set search_path = '' as $$
  select t.category_id from public.transactions t
  where t.status = 'confirmed' and t.type = p_type and t.category_id is not null
    and lower(t.merchant) = lower(trim(p_merchant))
  order by t.date desc, t.created_at desc
  limit 1
$$;

-- Protective nudges (docs/prd/part-3-design.md, section 7). These resurface
-- until resolved, so thresholds live here rather than in UI code.
create function public.protective_nudges()
returns table (kind text, count bigint)
language sql stable security invoker set search_path = '' as $$
  select 'uncategorized', count(*) from public.transactions
    where status = 'confirmed' and category_id is null
    having count(*) >= 5
  union all
  select 'unreviewed', count(*) from public.transactions
    where status = 'needs_review' and created_at < now() - interval '3 days'
    having count(*) >= 1
$$;

-- Daily cron: create real transactions for every rule that is due, catching
-- up on any missed days. Only the service role may call this.
create function public.run_due_recurring(p_today date default (now() at time zone 'Asia/Bangkok')::date)
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
        (user_id, account_id, category_id, recurring_rule_id, type, amount, date, merchant, note, status, source)
      values
        (r.user_id, r.account_id, r.category_id, r.id, r.type, r.amount, r.next_run_date, r.merchant, r.note, 'confirmed', 'recurring');
      created := created + 1;
      r.next_run_date := public.next_occurrence(r.next_run_date, r.frequency, r.anchor_day);
    end loop;
    update public.recurring_rules set next_run_date = r.next_run_date where id = r.id;
  end loop;
  return created;
end $$;

revoke execute on function public.run_due_recurring(date) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
