'use client';

import { useTransition } from 'react';
import { setRecurringActive } from '@/app/actions';

export function RuleActions({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn text-sm text-ink-soft" disabled={pending} onClick={() => start(() => setRecurringActive(id, !active))}>
      {active ? 'Pause' : 'Resume'}
    </button>
  );
}
