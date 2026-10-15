'use client';

import { useActionState, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { eraseMyData } from '@/app/actions';

/** Settings > Your data: erase everything and start over, after one explicit confirmation. */
export function EraseData() {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(eraseMyData, undefined);

  if (!confirming) {
    return (
      <button className="btn btn-quiet justify-self-start text-expense" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden /> Delete all my data
      </button>
    );
  }
  return (
    <form action={action} className="grid gap-3">
      <p role="alert">
        This erases every entry, slip photo, account, recurring item and category, then starts you over from the welcome
        steps. It can&apos;t be undone.
      </p>
      {state?.error && <p className="text-sm font-semibold text-expense">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-quiet text-expense" disabled={pending}>
          {pending ? 'Deleting…' : 'Delete everything'}
        </button>
        <button type="button" className="btn" disabled={pending} onClick={() => setConfirming(false)}>
          Keep my data
        </button>
      </div>
    </form>
  );
}
