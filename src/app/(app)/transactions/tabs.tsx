import Link from 'next/link';

const TABS = [
  { key: 'entries', href: '/transactions', label: 'Entries' },
  { key: 'recurring', href: '/transactions/recurring', label: 'Recurring' },
] as const;

/** Transactions heading with its two views: logged entries, and what repeats. */
export function TransactionsTabs({ current }: { current: (typeof TABS)[number]['key'] }) {
  return (
    <header className="grid gap-3">
      <h1 className="font-display text-2xl font-extrabold">Transactions</h1>
      <nav className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1" aria-label="Transactions view">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === current ? 'page' : undefined}
            className={`btn ${t.key === current ? 'btn-quiet' : 'text-ink-soft'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
