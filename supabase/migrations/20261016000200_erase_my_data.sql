-- "Delete all my data" (Settings): erase everything a user has logged and put
-- them back where a new sign-up starts, keeping the sign-in itself. Slip photos
-- live in Storage and are removed by the app before this runs.

-- What every user starts with: a profile at the first onboarding step and the
-- default categories. Shared by sign-up and erase_my_data().
create function public.seed_user_defaults(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (p_user);
  insert into public.categories (user_id, name, type, icon, is_default) values
    (p_user, 'Food & Dining', 'expense', 'utensils', true),
    (p_user, 'Groceries', 'expense', 'shopping-basket', true),
    (p_user, 'Transport', 'expense', 'bus', true),
    (p_user, 'Rent & Housing', 'expense', 'house', true),
    (p_user, 'Utilities', 'expense', 'plug', true),
    (p_user, 'Shopping', 'expense', 'shopping-bag', true),
    (p_user, 'Health', 'expense', 'heart-pulse', true),
    (p_user, 'Subscriptions', 'expense', 'repeat', true),
    (p_user, 'Transfers to people', 'expense', 'send', true),
    (p_user, 'Other', 'expense', 'circle', true),
    (p_user, 'Salary', 'income', 'briefcase', true),
    (p_user, 'Freelance', 'income', 'laptop', true),
    (p_user, 'Transfers in', 'income', 'download', true),
    (p_user, 'Other income', 'income', 'circle', true);
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end $$;

-- Erase the caller's data and start them over. Only ever touches auth.uid()'s rows.
create function public.erase_my_data() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  -- Entries first: they point at rules, accounts and categories.
  delete from public.transactions where user_id = me;
  delete from public.recurring_rules where user_id = me;
  delete from public.accounts where user_id = me;
  delete from public.categories where user_id = me;
  delete from public.profiles where user_id = me;
  perform public.seed_user_defaults(me);
end $$;

revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;
revoke execute on function public.erase_my_data() from public, anon;
grant execute on function public.erase_my_data() to authenticated;
