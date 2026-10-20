-- More default expense categories, so common Thai household spending has a
-- home without the user making one: loan repayments (mortgage, car, other),
-- insurance, education, money sent to family, travel, entertainment, personal
-- care, gifts and donations, and taxes and fees. Credit card bills are not a
-- category: paying one is a transfer to the card account, and the card
-- spending is already logged as expenses.
--
-- The list now lives in one place, default_categories(), used for new users
-- (seed_user_defaults, also run by erase_my_data) and to give existing users
-- the ones they don't have yet.

create function public.default_categories()
returns table (name text, type public.txn_type, icon text) language sql immutable set search_path = '' as $$
  values
    ('Food & Dining', 'expense'::public.txn_type, 'utensils'),
    ('Groceries', 'expense', 'shopping-basket'),
    ('Transport', 'expense', 'bus'),
    ('Rent & Housing', 'expense', 'house'),
    ('Mortgage', 'expense', 'house-plus'),
    ('Car loan', 'expense', 'car'),
    ('Loan repayments', 'expense', 'hand-coins'),
    ('Utilities', 'expense', 'plug'),
    ('Insurance', 'expense', 'shield-check'),
    ('Shopping', 'expense', 'shopping-bag'),
    ('Health', 'expense', 'heart-pulse'),
    ('Personal care', 'expense', 'scissors'),
    ('Education', 'expense', 'graduation-cap'),
    ('Family support', 'expense', 'users'),
    ('Travel', 'expense', 'plane'),
    ('Entertainment', 'expense', 'clapperboard'),
    ('Subscriptions', 'expense', 'repeat'),
    ('Gifts & donations', 'expense', 'gift'),
    ('Taxes & fees', 'expense', 'landmark'),
    ('Transfers to people', 'expense', 'send'),
    ('Other', 'expense', 'circle'),
    ('Salary', 'income', 'briefcase'),
    ('Freelance', 'income', 'laptop'),
    ('Transfers in', 'income', 'download'),
    ('Other income', 'income', 'circle')
$$;
revoke execute on function public.default_categories() from public, anon, authenticated;

create or replace function public.seed_user_defaults(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (p_user);
  insert into public.categories (user_id, name, type, icon, is_default)
  select p_user, d.name, d.type, d.icon, true from public.default_categories() d;
end $$;

-- Existing users get the new defaults too; a category they already have under
-- the same name (their own or an earlier default) is left as it is.
insert into public.categories (user_id, name, type, icon, is_default)
select u.id, d.name, d.type, d.icon, true
from auth.users u cross join public.default_categories() d
on conflict (user_id, type, name) do nothing;
