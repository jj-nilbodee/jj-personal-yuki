import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AddButton } from '@/components/add-sheet';
import { CategoryIcon } from '@/components/category-icon';
import { TransactionRow, UpcomingRow } from '@/components/transaction-row';
import { YukiArt } from '@/components/yuki';
import { daysUntil, formatMoney, formatMonth, todayISO } from '@/lib/format';
import { requireUser } from '@/lib/supabase/server';
import type { Category, MonthSummary, Transaction, UpcomingRecurring } from '@/lib/types';

function shiftMonth(month: string, by: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
}

function dueLabel(date: string) {
  const days = daysUntil(date);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { supabase } = await requireUser();
  const current = todayISO().slice(0, 7);
  const requested = (await searchParams).month;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : current;
  const isCurrent = month === current;

  const [summaryRes, recentRes, draftsRes, upcomingRes, nudgesRes, categoriesRes] = await Promise.all([
    supabase.rpc('month_summary', { p_month: `${month}-01` }),
    supabase
      .from('transactions')
      .select('*')
      .eq('status', 'confirmed')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('transactions').select('*').neq('status', 'confirmed').order('created_at', { ascending: false }),
    isCurrent ? supabase.rpc('upcoming_recurring', { p_days: 14 }) : Promise.resolve({ data: [] }),
    supabase.rpc('protective_nudges'),
    supabase.from('categories').select('*'),
  ]);

  const summary = summaryRes.data as MonthSummary | null;
  const recent = (recentRes.data ?? []) as Transaction[];
  const drafts = (draftsRes.data ?? []) as Transaction[];
  const upcoming = (upcomingRes.data ?? []) as UpcomingRecurring[];
  const nudges = (nudgesRes.data ?? []) as { kind: string; count: number }[];
  const categories = new Map(((categoriesRes.data ?? []) as Category[]).map((c) => [c.id, c]));

  const income = Number(summary?.income ?? 0);
  const expense = Number(summary?.expense ?? 0);
  const balance = income - expense;
  const topCategories = (summary?.categories ?? []).slice(0, 5);
  const maxCategory = Math.max(...topCategories.map((c) => Number(c.total)), 1);
  const nothingYet = recent.length === 0 && drafts.length === 0;

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
        <Link href={`/?month=${shiftMonth(month, -1)}`} className="grid size-11 place-items-center rounded-full" aria-label="Previous month">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-bold">{formatMonth(month)}</h1>
        {isCurrent ? (
          <span className="size-11" />
        ) : (
          <Link href={`/?month=${shiftMonth(month, 1)}`} className="grid size-11 place-items-center rounded-full" aria-label="Next month">
            <ChevronRight className="size-5" />
          </Link>
        )}
      </header>

      {nudges.map((n) => (
        <Link
          key={n.kind}
          href={n.kind === 'uncategorized' ? '/transactions?category=none' : '/transactions?status=review'}
          className="card flex items-center gap-4 border-accent p-4"
        >
          <YukiArt pose="sitting" size={56} />
          <p className="font-medium">
            Yuki is sitting on this until it&apos;s done:{' '}
            {n.kind === 'uncategorized'
              ? `${n.count} entries have no category.`
              : `${n.count} ${n.count === 1 ? 'slip is' : 'slips are'} waiting for a check.`}
          </p>
        </Link>
      ))}

      <section className="card p-5" aria-label="Balance">
        <p className="text-sm text-ink-soft">{isCurrent ? 'Balance this month' : 'Balance'}</p>
        <p className="num mt-1 text-4xl font-semibold tracking-tight">
          {balance < 0 && '−'}
          {formatMoney(Math.abs(balance))}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-bg p-3">
            <p className="flex items-center gap-1 text-sm text-ink-soft">
              <ArrowDownLeft className="size-4 text-income" aria-hidden /> Income
            </p>
            <p className="num mt-1 font-semibold text-income">{formatMoney(income)}</p>
          </div>
          <div className="rounded-2xl bg-bg p-3">
            <p className="flex items-center gap-1 text-sm text-ink-soft">
              <ArrowUpRight className="size-4 text-expense" aria-hidden /> Spent
            </p>
            <p className="num mt-1 font-semibold text-expense">{formatMoney(expense)}</p>
          </div>
        </div>
      </section>

      {nothingYet ? (
        <section className="card flex flex-col items-center gap-4 p-8 text-center">
          <YukiArt pose="asleep" size={120} />
          <p>Nothing logged yet. Yuki&apos;s napping until you add one.</p>
          <AddButton>
            <Plus className="size-5" aria-hidden /> Add your first expense
          </AddButton>
        </section>
      ) : (
        <>
          {drafts.length > 0 && (
            <section>
              <h2 className="mb-2 font-bold">To check</h2>
              <div className="card divide-y divide-border overflow-hidden">
                {drafts.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} category={categories.get(tx.category_id ?? '')} />
                ))}
              </div>
            </section>
          )}

          {topCategories.length > 0 && (
            <section>
              <h2 className="mb-2 font-bold">Top categories</h2>
              <ul className="card grid gap-4 p-4">
                {topCategories.map((c) => (
                  <li key={c.id ?? 'none'} className="grid gap-1.5">
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={c.icon} className="size-4 text-ink-soft" />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="num text-sm">{formatMoney(c.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(Number(c.total) / maxCategory) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 font-bold">Upcoming</h2>
              <div className="grid gap-2">
                {upcoming.slice(0, 5).map((u) => (
                  <UpcomingRow
                    key={`${u.rule_id}-${u.due_date}`}
                    merchant={u.merchant}
                    amount={u.amount}
                    type={u.type}
                    dueLabel={dueLabel(u.due_date)}
                    category={categories.get(u.category_id ?? '')}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-bold">Recent</h2>
              <Link href="/transactions" className="text-sm font-semibold text-accent">
                See all
              </Link>
            </div>
            <div className="card divide-y divide-border overflow-hidden">
              {recent.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} category={categories.get(tx.category_id ?? '')} showDate />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
