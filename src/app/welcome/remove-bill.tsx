'use client';

import { useState, useTransition } from 'react';
import { discardOnboardingBill } from '@/app/actions';

/** Remove a bill added by mistake in onboarding; asks once before removing. */
export function RemoveBill({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="btn shrink-0 text-sm text-ink-soft" aria-label={`Remove ${name}`} onClick={() => setConfirming(true)}>
        Remove
      </button>
    );
  }
  return (
    <span className="flex shrink-0 items-center" role="group" aria-label={`Remove ${name}?`}>
      <button
        type="button"
        className="btn px-3 text-sm text-expense"
        disabled={pending}
        autoFocus
        onClick={() => start(() => discardOnboardingBill(id))}
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
      <button type="button" className="btn px-3 text-sm" disabled={pending} onClick={() => setConfirming(false)}>
        Keep
      </button>
    </span>
  );
}
