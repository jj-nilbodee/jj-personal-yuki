'use client';

import { useTransition } from 'react';
import { setRecurringActive } from '@/app/actions';

export function RuleActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, start] = useTransition();
  const label = pending ? (active ? 'Pausing…' : 'Resuming…') : active ? 'Pause' : 'Resume';
  return (
    <button
      className="btn shrink-0 text-sm text-ink-soft"
      disabled={pending}
      aria-label={`${label} ${name}`}
      onClick={() => start(() => setRecurringActive(id, !active))}
    >
      {label}
    </button>
  );
}
