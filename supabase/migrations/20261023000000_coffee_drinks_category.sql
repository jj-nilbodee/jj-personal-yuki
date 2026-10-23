-- Coffee and drinks get their own default expense category, apart from
-- Food & Dining: a daily coffee or bubble tea is a habit people want to see
-- on its own, and it otherwise disappears into meals.

create or replace function public.default_categories()
returns table (name text, type public.txn_type, icon text) language sql immutable set search_path = '' as $$
  values
    ('Food & Dining', 'expense'::public.txn_type, 'utensils'),
    ('Coffee & drinks', 'expense', 'coffee'),
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

-- Existing users get it too; past entries stay under the category they were
-- logged with. A category they already have under the same name is left as it is.
insert into public.categories (user_id, name, type, icon, is_default)
select u.id, d.name, d.type, d.icon, true
from auth.users u cross join public.default_categories() d
on conflict (user_id, type, name) do nothing;
