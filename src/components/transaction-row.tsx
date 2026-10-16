import Link from 'next/link';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarClock } from 'lucide-react';
import { transferLabel } from '@/lib/accounts';
import { formatDay, formatSigned } from '@/lib/format';
import type { Category, Transaction, TxnType } from '@/lib/types';
import { CategoryIcon } from './category-icon';
import { PawProgress } from './yuki';

type Row = Pick<
  Transaction,
  'id' | 'type' | 'amount' | 'merchant' | 'note' | 'status' | 'date' | 'slip_path' | 'account_id' | 'to_account_id' | 'for_next_month' | 'ledger_month'
>;

// Direction arrow pairs with colour so income vs expense never relies on colour alone.
// Transfers and undecided slip drafts are neither, so they stay in ink.
const AMOUNT_STYLE: Record<TxnType, { Arrow: typeof ArrowUpRight; color: string }> = {
  income: { Arrow: ArrowDownLeft, color: 'text-income' },
  expense: { Arrow: ArrowUpRight, color: 'text-expense' },
  transfer: { Arrow: ArrowLeftRight, color: 'text-ink' },
};

export function TransactionRow({
  tx,
  category,
  accounts,
  showDate,
}: {
  tx: Row;
  category?: Category;
  accounts: Map<string, { name: string }>;
  showDate?: boolean;
}) {
  const isTransfer = tx.type === 'transfer';
  const title = isTransfer
    ? transferLabel(tx.account_id, tx.to_account_id, accounts)
    : (tx.merchant ?? category?.name ?? (tx.status === 'confirmed' ? 'Untitled' : 'Slip'));
  const look = tx.type ? AMOUNT_STYLE[tx.type] : null;
  return (
    <Link href={`/transactions/${tx.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-ink">
        {isTransfer ? <ArrowLeftRight className="size-5" aria-hidden /> : <CategoryIcon name={category?.icon} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-ink-soft">
          {tx.status === 'processing' ? (
            <PawProgress />
          ) : tx.status === 'needs_review' ? (
            <span className="font-semibold text-accent">Check this one</span>
          ) : (
            [
              showDate && formatDay(tx.date),
              isTransfer ? 'Transfer' : (category?.name ?? 'No category'),
              // Paid at month-end for the month after: say which month it counts in.
              tx.for_next_month && `For ${new Date(`${tx.ledger_month}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })}`,
              tx.slip_path && 'Slip',
            ]
              .filter(Boolean)
              .join(' · ')
          )}
        </span>
      </span>
      {tx.amount !== null && (
        <span className={`num flex items-center gap-1 font-semibold ${look?.color ?? 'text-ink'}`}>
          {look && <look.Arrow className="size-4" aria-label={tx.type ?? undefined} />}
          {formatSigned(tx.amount, tx.type)}
        </span>
      )}
    </Link>
  );
}

export function UpcomingRow({
  merchant,
  amount,
  type,
  dueLabel,
  category,
}: {
  merchant: string | null;
  amount: number;
  type: TxnType;
  dueLabel: string;
  category?: Category;
}) {
  // Not a real entry yet, so it's drawn dashed and muted rather than like a ledger row.
  return (
    <div className="flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-2.5 text-ink-soft">
      <CalendarClock className="size-5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{merchant ?? category?.name ?? 'Recurring'}</span>
        <span className="block text-sm">{dueLabel}</span>
      </span>
      <span className="num">{formatSigned(amount, type)}</span>
    </div>
  );
}
