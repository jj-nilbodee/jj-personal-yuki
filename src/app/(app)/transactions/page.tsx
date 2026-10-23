import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { AccountOptions } from '@/components/account-options';
import { AddButton } from '@/components/add-sheet';
import { EmptyLedger } from '@/components/empty-ledger';
import { TransactionRow } from '@/components/transaction-row';
import { formatDay, formatMoney, formatMonth } from '@/lib/format';
import { getProfile } from '@/lib/profile';
import { requireUser } from '@/lib/supabase/server';
import type { Account, Category, Transaction, TxnType } from '@/lib/types';
import { TransactionsTabs } from './tabs';

const PAGE_SIZE = 200;
const TYPE_FILTERS: { type: TxnType; label: string }[] = [
  { type: 'income', label: 'Income' },
  { type: 'expense', label: 'Expenses' },
  { type: 'transfer', label: 'Transfers' },
];

// `month` (YYYY-MM) is the month entries count toward, which differs from the date for income
// that covers the following month. The dashboard's income/spent tiles link with it.
type Filters = { q?: string; type?: string; category?: string; account?: string; from?: string; to?: string; month?: string; status?: string };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { supabase } = await requireUser();
  const f = await searchParams;

  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  // Strip PostgREST filter syntax characters from free text before building the OR filter.
  const q = f.q?.replace(/[,()*%\\]/g, ' ').trim();
  if (q) {
    const amount = Number(q.replace(/[฿,\s]/g, ''));
    query = query.or(
      [`note.ilike.%${q}%`, Number.isFinite(amount) && amount > 0 && `amount.eq.${amount}`]
        .filter(Boolean)
        .join(','),
    );
  }
  const type = TYPE_FILTERS.find((t) => t.type === f.type)?.type;
  if (type) query = query.eq('type', type);
  if (f.category === 'none') query = query.is('category_id', null).eq('status', 'confirmed');
  else if (f.category) query = query.eq('category_id', f.category);
  // An account's history includes transfers into it. Only a UUID can reach the raw filter string.
  if (f.account && /^[0-9a-f-]{36}$/i.test(f.account)) {
    query = query.or(`account_id.eq.${f.account},to_account_id.eq.${f.account}`);
  }
  if (f.from) query = query.gte('date', f.from);
  if (f.to) query = query.lte('date', f.to);
  const month = f.month && /^\d{4}-\d{2}$/.test(f.month) ? f.month : null;
  if (month) query = query.eq('ledger_month', `${month}-01`);
  if (f.status === 'review') query = query.neq('status', 'confirmed');

  const [{ data: txData }, { data: catData }, { data: accData }, profile, { data: incomeRules }] = await Promise.all([
    query,
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name'),
    getProfile(),
    supabase.from('recurring_rules').select('id').eq('type', 'income').eq('active', true).limit(1),
  ]);
  const transactions = (txData ?? []) as Transaction[];
  const categoryList = (catData ?? []) as Category[];
  const categories = new Map(categoryList.map((c) => [c.id, c]));
  const accounts = (accData ?? []) as Account[];
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const filtered = Object.values(f).some(Boolean);

  const byDay = new Map<string, Transaction[]>();
  for (const tx of transactions) byDay.set(tx.date, [...(byDay.get(tx.date) ?? []), tx]);

  return (
    <div className="grid gap-5">
      <TransactionsTabs current="entries" />

      <form className="grid gap-2" role="search">
        <label className="relative block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input name="q" defaultValue={f.q} placeholder="Note or amount" className="field pl-10" type="search" />
        </label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <select name="type" defaultValue={type ?? ''} className="field" aria-label="Type">
            <option value="">All types</option>
            {TYPE_FILTERS.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={f.category ?? ''} className="field" aria-label="Category">
            <option value="">All categories</option>
            <option value="none">No category</option>
            {categoryList
              .filter((c) => !type || c.type === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <select name="account" defaultValue={f.account ?? ''} className="field col-span-2 md:col-span-1" aria-label="Account">
            <option value="">All accounts</option>
            <AccountOptions accounts={accounts} selected={f.account} />
          </select>
          <input name="from" type="date" defaultValue={f.from} className="field" aria-label="From date" />
          <input name="to" type="date" defaultValue={f.to} className="field" aria-label="To date" />
        </div>
        {f.status && <input type="hidden" name="status" value={f.status} />}
        {month && <input type="hidden" name="month" value={month} />}
        {month && <p className="text-sm text-ink-soft">Counted in {formatMonth(`${month}-01`)}</p>}
        <div className="flex gap-2">
          <button className="btn btn-quiet">Apply</button>
          {filtered && (
            <Link href="/transactions" className="btn">
              Clear
            </Link>
          )}
        </div>
      </form>

      {transactions.length === 0 ? (
        filtered ? (
          <p className="text-ink-soft">No entries match these filters. Clear them to see everything.</p>
        ) : (
          <EmptyLedger name={profile?.display_name ?? null} salaryScheduled={(incomeRules ?? []).length > 0} />
        )
      ) : (
        [...byDay].map(([day, rows]) => {
          const net = rows
            .filter((t) => t.status === 'confirmed' && t.amount !== null && t.type !== 'transfer')
            .reduce((sum, t) => sum + (t.type === 'income' ? 1 : -1) * Number(t.amount), 0);
          return (
            <section key={day}>
              <div className="mb-1.5 flex items-baseline justify-between px-1 text-sm text-ink-soft">
                <h2 className="font-semibold">{formatDay(day)}</h2>
                <span className="num">
                  {net < 0 && '−'}
                  {formatMoney(Math.abs(net))}
                </span>
              </div>
              <div className="card divide-y divide-border overflow-hidden">
                {rows.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} category={categories.get(tx.category_id ?? '')} accounts={accountMap} />
                ))}
              </div>
            </section>
          );
        })
      )}
      {transactions.length === PAGE_SIZE && (
        <p className="text-center text-sm text-ink-soft">Showing the latest {PAGE_SIZE}. Narrow the dates to see older entries.</p>
      )}
    </div>
  );
}
