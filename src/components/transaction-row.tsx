import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from 'lucide-react';
import { formatDay, formatSigned } from '@/lib/format';
import type { Category, Transaction } from '@/lib/types';
import { CategoryIcon } from './category-icon';
import { PawProgress } from './yuki';

type Row = Pick<Transaction, 'id' | 'type' | 'amount' | 'merchant' | 'note' | 'status' | 'date' | 'slip_path'>;

export function TransactionRow({ tx, category, showDate }: { tx: Row; category?: Category; showDate?: boolean }) {
  const title = tx.merchant ?? category?.name ?? (tx.status === 'confirmed' ? 'Untitled' : 'Slip');
  // Direction arrow pairs with colour so income vs expense never relies on colour alone.
  const Arrow = tx.type === 'income' ? ArrowDownLeft : ArrowUpRight;
  return (
    <Link href={`/transactions/${tx.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-ink">
        <CategoryIcon name={category?.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-ink-soft">
          {tx.status === 'processing' ? (
            <PawProgress />
          ) : tx.status === 'needs_review' ? (
            <span className="font-semibold text-accent">Check this one</span>
          ) : (
            [showDate && formatDay(tx.date), category?.name ?? 'No category', tx.slip_path && 'Slip'].filter(Boolean).join(' · ')
          )}
        </span>
      </span>
      {tx.amount !== null && (
        <span className={`num flex items-center gap-1 font-semibold ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
          <Arrow className="size-4" aria-label={tx.type} />
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
  type: 'income' | 'expense';
  dueLabel: string;
  category?: Category;
}) {
  // Not a real entry yet, so it's drawn dashed and muted rather than like a ledger row.
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-2.5 text-ink-soft">
      <CalendarClock className="size-5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{merchant ?? category?.name ?? 'Recurring'}</span>
        <span className="block text-sm">{dueLabel}</span>
      </span>
      <span className="num">{formatSigned(amount, type)}</span>
    </div>
  );
}
