-- Onboarding's bills step lists what the user has set to repeat so far. A bill
-- added by mistake can be removed there: the rule goes, together with the
-- entries it logged, and account balances stay where the user set them (the
-- logging didn't move them either; see start_recurring). Only while
-- onboarding: afterwards entries are real history and are deleted one by one.
create function public.discard_onboarding_bill(p_rule uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  r public.recurring_rules;
  from_bal numeric;
  to_bal numeric;
begin
  if not exists (select 1 from public.profiles where onboarding_step is not null) then
    raise exception 'bills can only be discarded during onboarding';
  end if;
  select * into r from public.recurring_rules where id = p_rule;
  if not found then return; end if;

  select b.balance into from_bal from public.account_balances() b where b.id = r.account_id;
  select b.balance into to_bal from public.account_balances() b where b.id = r.to_account_id;
  delete from public.transactions where recurring_rule_id = r.id;
  delete from public.recurring_rules where id = r.id;
  if from_bal is not null then perform public.set_account_balance(r.account_id, from_bal); end if;
  if to_bal is not null then perform public.set_account_balance(r.to_account_id, to_bal); end if;
end $$;
