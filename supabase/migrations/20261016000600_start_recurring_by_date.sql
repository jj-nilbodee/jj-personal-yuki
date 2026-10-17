-- One way to add something that repeats: the entry form with a Repeat
-- schedule. Whether it is logged now depends only on the date entered:
--  * on or before today, it is a payment already made: it is logged as an
--    entry and repeats from the next scheduled date (make_recurring: dates
--    already past are skipped, not back-filled);
--  * after today, nothing is logged yet: the rule's first run is that date
--    (a month-end rule: that month's last day), and the cron logs it then.
-- During onboarding the balances the user just entered already include past
-- payments, so logging one leaves account balances where they were.
-- p_entry holds the transactions columns the entry form sets; anything else
-- in it is ignored. Replaces the "already paid" flag of the first version.
drop function public.start_recurring(jsonb, boolean, date);
create function public.start_recurring(
  p_entry jsonb,
  p_frequency public.recur_frequency,
  p_anchor_day int default null,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  t public.transactions := jsonb_populate_record(null::public.transactions, p_entry);
  anchor int;
  first_d date;
  keep_balances boolean;
  from_bal numeric;
  to_bal numeric;
  r public.recurring_rules;
begin
  t.date := coalesce(t.date, p_today);
  anchor := coalesce(p_anchor_day, extract(day from t.date)::int);

  if t.date <= p_today then
    keep_balances := exists (select 1 from public.profiles where onboarding_step is not null);
    if keep_balances then
      select b.balance into from_bal from public.account_balances() b where b.id = t.account_id;
      select b.balance into to_bal from public.account_balances() b where b.id = t.to_account_id;
    end if;
    insert into public.transactions (type, amount, account_id, to_account_id, category_id, merchant, note, for_next_month, date)
    values (t.type, t.amount, t.account_id, t.to_account_id, t.category_id, t.merchant, t.note, t.for_next_month, t.date)
    returning * into t;
    r := public.make_recurring(t.id, p_frequency, p_anchor_day, p_today);
    if from_bal is not null then perform public.set_account_balance(t.account_id, from_bal); end if;
    if to_bal is not null then perform public.set_account_balance(t.to_account_id, to_bal); end if;
    return r;
  end if;

  first_d := t.date;
  if p_frequency <> 'weekly' then
    -- The anchor day in the entered month, clamped to the month's length.
    first_d := date_trunc('month', t.date)::date
      + (least(anchor, extract(day from (date_trunc('month', t.date) + interval '1 month - 1 day'))::int) - 1);
    if first_d < t.date then first_d := public.next_occurrence(first_d, p_frequency, anchor); end if;
  end if;

  insert into public.recurring_rules
    (type, amount, account_id, to_account_id, category_id, merchant, note, for_next_month, frequency, anchor_day, next_run_date)
  values
    (t.type, t.amount, t.account_id, t.to_account_id, t.category_id, t.merchant, t.note, t.for_next_month, p_frequency, anchor, first_d)
  returning * into r;
  return r;
end $$;
