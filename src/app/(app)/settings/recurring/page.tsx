import Link from 'next/link';
import { Plus } from 'lucide-react';
import { BackHeader } from '@/components/back-header';
import { YukiArt } from '@/components/yuki';
import { formatDay, formatSigned } from '@/lib/format';
import { requireUser } from '@/lib/supabase/server';
import type { Category, RecurringRule } from '@/lib/types';
import { RuleActions } from './rule-actions';

const FREQUENCY = { weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' } as const;

export default async function RecurringPage() {
  const { supabase } = await requireUser();
  const [{ data: rules }, { data: cats }] = await Promise.all([
    supabase.from('recurring_rules').select('*').order('next_run_date'),
    supabase.from('categories').select('*'),
  ]);
  const categories = new Map(((cats ?? []) as Category[]).map((c) => [c.id, c]));
  const list = (rules ?? []) as RecurringRule[];

  return (
    <div className="grid gap-6">
      <BackHeader href="/settings" title="Recurring" />
      <p className="text-sm text-ink-soft">
        Each one is added to your transactions automatically on its due date. Until then it shows as upcoming on the dashboard.
      </p>
      {list.length === 0 ? (
        <section className="card flex flex-col items-center gap-4 p-8 text-center">
          <YukiArt pose="asleep" size={104} />
          <p>Rent, subscriptions and salary can log themselves.</p>
          <Link href="/settings/recurring/new" className="btn btn-primary">
            <Plus className="size-5" aria-hidden /> Add a recurring transaction
          </Link>
        </section>
      ) : (
        <>
          <ul className="card divide-y divide-border">
            {list.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.active ? '' : 'text-ink-soft'}`}>
                <Link href={`/settings/recurring/${r.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.merchant ?? categories.get(r.category_id ?? '')?.name ?? 'Recurring'}</span>
                  <span className="block text-sm text-ink-soft">
                    {r.active ? `${FREQUENCY[r.frequency]} · next ${formatDay(r.next_run_date)}` : 'Paused'}
                  </span>
                </Link>
                <span className="num">{formatSigned(r.amount, r.type)}</span>
                <RuleActions id={r.id} active={r.active} />
              </li>
            ))}
          </ul>
          <Link href="/settings/recurring/new" className="btn btn-quiet justify-self-start">
            <Plus className="size-5" aria-hidden /> Add a recurring transaction
          </Link>
        </>
      )}
    </div>
  );
}
