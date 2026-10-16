-- Create a recurring rule whose first due date may already have come this
-- month: onboarding's bills step on the 16th, for rent paid on the 1st. With
-- p_already_paid every due date from the first through today is logged as an
-- entry linked to the rule; without it, past dates are skipped, not
-- back-filled. Either way the rule next runs on its first due date still to
-- come (today counts, unless it was already paid). Dates before this month are
-- refused, so a new rule never back-fills history. p_rule holds the
-- recurring_rules columns the app sets; anything else in it is ignored.
create function public.start_recurring(
  p_rule jsonb,
  p_already_paid boolean default false,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  r public.recurring_rules := jsonb_populate_record(null::public.recurring_rules, p_rule);
  last_logged date := case when p_already_paid then p_today else p_today - 1 end;
  paid date[] := '{}';
  d date;
begin
  if r.next_run_date < date_trunc('month', p_today)::date then
    raise exception 'the first due date can''t be before this month';
  end if;
  while r.next_run_date <= last_logged loop
    if p_already_paid then paid := paid || r.next_run_date; end if;
    r.next_run_date := public.next_occurrence(r.next_run_date, r.frequency, r.anchor_day);
  end loop;

  insert into public.recurring_rules
    (type, amount, account_id, to_account_id, category_id, merchant, note, for_next_month, frequency, anchor_day, next_run_date)
  values
    (r.type, r.amount, r.account_id, r.to_account_id, r.category_id, r.merchant, r.note, r.for_next_month, r.frequency, r.anchor_day, r.next_run_date)
  returning * into r;

  foreach d in array paid loop
    insert into public.transactions
      (type, amount, account_id, to_account_id, category_id, recurring_rule_id, merchant, note, for_next_month, date)
    values
      (r.type, r.amount, r.account_id, r.to_account_id, r.category_id, r.id, r.merchant, r.note, r.for_next_month, d);
  end loop;
  return r;
end $$;
