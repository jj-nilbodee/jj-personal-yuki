-- The dashboard breaks income down by category too, alongside spending.
-- `categories` stays the spending breakdown; `income_categories` is new.
create or replace function public.month_summary(p_month date default (now() at time zone 'Asia/Bangkok')::date)
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
    select tx.type, c.id, coalesce(c.name, 'Uncategorized') as name, coalesce(c.icon, 'circle') as icon,
           sum(tx.amount) as total, count(*) as count
    from tx left join public.categories c on c.id = tx.category_id
    where tx.type in ('expense', 'income')
    group by tx.type, c.id, c.name, c.icon
  )
  select jsonb_build_object(
    'month', (select start_d from bounds),
    'income', coalesce((select sum(amount) from tx where type = 'income'), 0),
    'expense', coalesce((select sum(amount) from tx where type = 'expense'), 0),
    'count', (select count(*) from tx),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'icon', icon, 'total', total, 'count', count) order by total desc)
      from by_cat where type = 'expense'
    ), '[]'::jsonb),
    'income_categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'icon', icon, 'total', total, 'count', count) order by total desc)
      from by_cat where type = 'income'
    ), '[]'::jsonb)
  )
$$;
