import Link from 'next/link';
import { Plus } from 'lucide-react';
import { SignedAmount } from '@/components/transaction-row';
import { YukiArt } from '@/components/yuki';
import { transferLabel } from '@/lib/accounts';
import { formatDay } from '@/lib/format';
import { REPEAT_LABEL, repeatOf } from '@/lib/recurring';
import { requireUser } from '@/lib/supabase/server';
import type { Account, Category, RecurringRule } from '@/lib/types';
import { TransactionsTabs } from '../tabs';
import { RuleActions } from './rule-actions';

export default async function RecurringPage() {
  const { supabase } = await requireUser();
  const [{ data: rules }, { data: cats }, { data: accs }] = await Promise.all([
    supabase.from('recurring_rules').select('*').order('next_run_date'),
    supabase.from('categories').select('*'),
    supabase.from('accounts').select('*'),
  ]);
  const categories = new Map(((cats ?? []) as Category[]).map((c) => [c.id, c]));
  const accounts = new Map(((accs ?? []) as Account[]).map((a) => [a.id, a]));
  const list = (rules ?? []) as RecurringRule[];

  return (
    <div className="grid gap-5">
      <TransactionsTabs current="recurring" />
      <p className="text-sm text-ink-soft">
        Each one is added to your entries automatically on its due date. Until then it shows as upcoming on the dashboard.
      </p>
      {list.length === 0 ? (
        <section className="card flex flex-col items-center gap-4 p-8 text-center">
          <YukiArt pose="asleep" size={104} />
          <p>Rent, subscriptions and salary can log themselves.</p>
          <Link href="/transactions/new?repeat=monthly" className="btn btn-primary">
            <Plus className="size-5" aria-hidden /> Add a recurring transaction
          </Link>
        </section>
      ) : (
        <>
          <ul className="card divide-y divide-border overflow-hidden">
            {list.map((r) => {
              const name = r.type === 'transfer'
                ? transferLabel(r.account_id, r.to_account_id, accounts)
                : (r.merchant ?? categories.get(r.category_id ?? '')?.name ?? 'Recurring');
              return (
                <li key={r.id} className={`flex items-center gap-3 pr-2 ${r.active ? '' : 'text-ink-soft'}`}>
                  <Link href={`/transactions/recurring/${r.id}`} className="pressable flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{name}</span>
                      <span className="block text-sm text-ink-soft">
                        {r.active ? `${REPEAT_LABEL[repeatOf(r)]} · next ${formatDay(r.next_run_date)}` : 'Paused'}
                      </span>
                    </span>
                    <SignedAmount amount={r.amount} type={r.type} muted={!r.active} />
                  </Link>
                  <RuleActions id={r.id} name={name} active={r.active} />
                </li>
              );
            })}
          </ul>
          <Link href="/transactions/new?repeat=monthly" className="btn btn-quiet justify-self-start">
            <Plus className="size-5" aria-hidden /> Add a recurring transaction
          </Link>
        </>
      )}
    </div>
  );
}
