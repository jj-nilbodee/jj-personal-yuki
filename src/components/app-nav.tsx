'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, List, Plus, Settings } from 'lucide-react';
import { useAddSheet } from './add-sheet';
import { YukiArt } from './yuki';

const TABS = [
  { href: '/', label: 'Dashboard', icon: House },
  { href: '/transactions', label: 'Transactions', icon: List },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();
  const { open } = useAddSheet();
  const [dashboard, transactions, settings] = TABS;

  const tab = (t: (typeof TABS)[number]) => {
    const active = isActive(pathname, t.href);
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-full md:px-4 md:text-sm ${
          active ? 'text-accent md:bg-accent-soft md:text-ink' : 'text-ink-soft'
        }`}
      >
        <t.icon className="size-6 md:size-5" aria-hidden />
        <span className="font-display">{t.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Phone: bottom tab bar. Order per PRD: Dashboard / Add / Transactions / Settings. */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden" aria-label="Main">
        <div className="mx-auto flex max-w-lg items-stretch">
          {tab(dashboard)}
          <button onClick={open} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-ink-soft">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-on-accent">
              <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="sr-only">Add</span>
          </button>
          {tab(transactions)}
          {tab(settings)}
        </div>
      </nav>

      {/* Desktop: sidebar */}
      <nav className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 border-r border-border p-5 md:flex" aria-label="Main">
        <Link href="/" className="mb-6 flex items-center gap-3">
          <YukiArt pose="loaf" size={40} />
          <span className="font-display text-xl font-extrabold">Yuki</span>
        </Link>
        <button onClick={open} className="btn btn-primary mb-4">
          <Plus className="size-5" aria-hidden /> Add
        </button>
        {tab(dashboard)}
        {tab(transactions)}
        {tab(settings)}
      </nav>
    </>
  );
}
