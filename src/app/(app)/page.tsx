import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AddButton } from '@/components/add-sheet';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyLedger } from '@/components/empty-ledger';
import { TransactionRow, UpcomingRow } from '@/components/transaction-row';
import { YukiArt } from '@/components/yuki';
import { groupAccounts, transferLabel } from '@/lib/accounts';
import { daysUntil, formatBalance, formatMoney, formatMonth, todayISO } from '@/lib/format';
import { getProfile } from '@/lib/profile';
import { requireUser } from '@/lib/supabase/server';
import type { AccountBalance, Category, CategoryTotal, MonthSummary, Transaction, UpcomingRecurring } from '@/lib/types';

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

function CategoryBreakdown({ title, Arrow, bar, rows }: { title: string; Arrow: typeof ArrowUpRight; bar: string; rows: CategoryTotal[] }) {
  const top = rows.slice(0, 5);
  const max = Math.max(...top.map((c) => Number(c.total)), 1);
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 font-bold">
        <Arrow className="size-4 text-ink-soft" aria-hidden /> {title}
      </h2>
      <ul className="card grid gap-4 p-4">
        {top.map((c) => (
          <li key={c.id ?? 'none'} className="grid gap-1.5">
            <div className="flex items-center gap-2">
              <CategoryIcon name={c.icon} className="size-4 text-ink-soft" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="num text-sm">{formatMoney(c.total)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${(Number(c.total) / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { supabase } = await requireUser();
  const current = todayISO().slice(0, 7);
  const requested = (await searchParams).month;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : current;
  const isCurrent = month === current;

  const [summaryRes, recentRes, draftsRes, upcomingRes, nudgesRes, categoriesRes, balancesRes, profile, incomeRuleRes] = await Promise.all([
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
    supabase.rpc('account_balances'),
    getProfile(),
    supabase.from('recurring_rules').select('id').eq('type', 'income').eq('active', true).limit(1),
  ]);

  const summary = summaryRes.data as MonthSummary | null;
  const recent = (recentRes.data ?? []) as Transaction[];
  const drafts = (draftsRes.data ?? []) as Transaction[];
  const upcoming = (upcomingRes.data ?? []) as UpcomingRecurring[];
  const nudges = (nudgesRes.data ?? []) as { kind: string; count: number }[];
  const categories = new Map(((categoriesRes.data ?? []) as Category[]).map((c) => [c.id, c]));
  const balances = (balancesRes.data ?? []) as AccountBalance[];
  const accounts = new Map(balances.map((a) => [a.id, a]));
  const accountGroups = groupAccounts(balances.filter((a) => !a.archived));

  const income = Number(summary?.income ?? 0);
  const expense = Number(summary?.expense ?? 0);
  const balance = income - expense;
  const spendingCategories = summary?.categories ?? [];
  const incomeCategories = summary?.income_categories ?? [];
  const nothingYet = recent.length === 0 && drafts.length === 0;
  const toName = profile?.display_name ? `, ${profile.display_name}` : '';
  // The budget is about the month in progress; past months just show what happened.
  const budget = isCurrent && summary?.budget != null ? Number(summary.budget) : null;
  const budgetLeft = Number(summary?.budget_left ?? 0);
  // A salary set to log itself shouldn't also be asked for by hand, or it would be counted twice.
  const salaryScheduled = (incomeRuleRes.data ?? []).length > 0;
  // The balance only means something once income is in, so ask for it before anything else.
  const askForIncome = isCurrent && income === 0 && !nothingYet && !salaryScheduled;

  const upcomingSection = upcoming.length > 0 && (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-bold">Upcoming</h2>
        <Link href="/transactions/recurring" className="text-sm font-semibold text-accent">
          See all
        </Link>
      </div>
      <div className="grid gap-2">
        {upcoming.slice(0, 5).map((u) => (
          <UpcomingRow
            key={`${u.rule_id}-${u.due_date}`}
            title={u.type === 'transfer' ? transferLabel(u.account_id, u.to_account_id, accounts) : u.note}
            amount={u.amount}
            type={u.type}
            dueLabel={dueLabel(u.due_date)}
            category={categories.get(u.category_id ?? '')}
          />
        ))}
      </div>
    </section>
  );

  return (
    // grid-cols-1 (minmax(0, 1fr)): long notes or bill names truncate instead of widening the page.
    <div className="grid grid-cols-1 gap-6">
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
            Yuki is sitting on this until it&apos;s done{toName}:{' '}
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
          <Link href={`/transactions?type=income&month=${month}`} className="rounded-2xl bg-bg p-3">
            <p className="flex items-center gap-1 text-sm text-ink-soft">
              <ArrowDownLeft className="size-4 text-income" aria-hidden /> Income
            </p>
            <p className="num mt-1 font-semibold text-income">{formatMoney(income)}</p>
          </Link>
          <Link href={`/transactions?type=expense&month=${month}`} className="rounded-2xl bg-bg p-3">
            <p className="flex items-center gap-1 text-sm text-ink-soft">
              <ArrowUpRight className="size-4 text-expense" aria-hidden /> Spent
            </p>
            <p className="num mt-1 font-semibold text-expense">{formatMoney(expense)}</p>
          </Link>
        </div>
        {budget !== null && (
          <div className="mt-4 grid gap-2 border-t border-border pt-4">
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span>{budgetLeft >= 0 ? 'Left to spend' : 'Over budget'}</span>
              <span className="num font-semibold">{formatMoney(Math.abs(budgetLeft))}</span>
            </p>
            <div
              className="h-2 overflow-hidden rounded-full bg-bg"
              role="progressbar"
              aria-label="Budget spent"
              aria-valuemin={0}
              aria-valuemax={budget}
              aria-valuenow={Math.min(expense, budget)}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (expense / budget) * 100)}%` }} />
            </div>
            <p className="num text-xs text-ink-soft">
              {formatMoney(expense)} of {formatMoney(budget)}
            </p>
          </div>
        )}
        {askForIncome && (
          <div className="mt-4 grid gap-3 border-t border-border pt-4">
            <p className="text-sm">No income logged this month yet. Add it first so the balance shows what&apos;s left.</p>
            <Link href="/transactions/new?type=income" className="btn btn-quiet">
              <ArrowDownLeft className="size-5 text-income" aria-hidden /> Add income
            </Link>
          </div>
        )}
      </section>

      {nothingYet ? (
        <EmptyLedger name={profile?.display_name ?? null} salaryScheduled={salaryScheduled} />
      ) : (
        <>
          {drafts.length > 0 && (
            <section>
              <h2 className="mb-2 font-bold">To check</h2>
              <div className="card divide-y divide-border overflow-hidden">
                {drafts.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} category={categories.get(tx.category_id ?? '')} accounts={accounts} />
                ))}
              </div>
            </section>
          )}

          {spendingCategories.length > 0 && (
            <CategoryBreakdown title="Spending by category" Arrow={ArrowUpRight} bar="bg-accent" rows={spendingCategories} />
          )}

          {incomeCategories.length > 0 && (
            <CategoryBreakdown title="Income by category" Arrow={ArrowDownLeft} bar="bg-income" rows={incomeCategories} />
          )}

          {upcomingSection}

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-bold">Recent</h2>
              <Link href="/transactions" className="text-sm font-semibold text-accent">
                See all
              </Link>
            </div>
            <div className="card divide-y divide-border overflow-hidden">
              {recent.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} category={categories.get(tx.category_id ?? '')} accounts={accounts} showDate />
              ))}
            </div>
          </section>
        </>
      )}

      {nothingYet && upcomingSection}

      {accountGroups.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-bold">Accounts</h2>
            <Link href="/settings/accounts" className="text-sm font-semibold text-accent">
              Manage
            </Link>
          </div>
          <div className="card divide-y divide-border overflow-hidden">
            {accountGroups.map((g) => (
              <div key={g.type} className="px-4 py-2">
                <h3 className="pt-1 text-sm text-ink-soft">{g.label}</h3>
                <ul>
                  {g.accounts.map((a) => (
                    <li key={a.id}>
                      <Link href={`/transactions?account=${a.id}`} className="flex min-h-11 items-center gap-3">
                        <span className="min-w-0 flex-1 truncate">{a.name}</span>
                        <span className="num font-semibold">{formatBalance(Number(a.balance), a.type)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
