-- Turn a saved entry into a recurring rule ("my salary comes in at the end of
-- every month"). The rule's first run is the first scheduled date after the
-- entry: a salary logged on the 15th with a month-end schedule next runs on the
-- last day of that same month. Dates already in the past are skipped, not
-- back-filled. p_anchor_day defaults to the entry's day of month; 31 means the
-- last day of every month (see next_occurrence).
create function public.make_recurring(
  p_transaction_id uuid,
  p_frequency public.recur_frequency,
  p_anchor_day int default null,
  p_today date default (now() at time zone 'Asia/Bangkok')::date
)
returns public.recurring_rules language plpgsql security invoker set search_path = '' as $$
declare
  t public.transactions;
  anchor int;
  next_d date;
  r public.recurring_rules;
begin
  select * into t from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'entry not found'; end if;
  if t.status <> 'confirmed' then raise exception 'save the entry before setting it to repeat'; end if;
  if t.recurring_rule_id is not null then raise exception 'this entry already repeats'; end if;

  anchor := coalesce(p_anchor_day, extract(day from t.date)::int);
  if p_frequency <> 'weekly' then
    -- The anchor day in the entry's own month, clamped to the month's length.
    next_d := date_trunc('month', t.date)::date
      + (least(anchor, extract(day from (date_trunc('month', t.date) + interval '1 month - 1 day'))::int) - 1);
  end if;
  if next_d is null or next_d <= t.date then
    next_d := public.next_occurrence(t.date, p_frequency, anchor);
  end if;
  while next_d < p_today loop
    next_d := public.next_occurrence(next_d, p_frequency, anchor);
  end loop;

  insert into public.recurring_rules
    (type, amount, account_id, to_account_id, category_id, merchant, note, frequency, anchor_day, next_run_date)
  values
    (t.type, t.amount, t.account_id, t.to_account_id, t.category_id, t.merchant, t.note, p_frequency, anchor, next_d)
  returning * into r;

  update public.transactions set recurring_rule_id = r.id where id = t.id;
  return r;
end $$;
