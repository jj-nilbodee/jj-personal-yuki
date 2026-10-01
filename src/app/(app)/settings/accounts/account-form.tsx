'use client';

import { useActionState, useTransition } from 'react';
import { saveAccount, setAccountArchived } from '@/app/actions';
import { THAI_BANKS } from '@/lib/slip/qr';
import type { Account, AccountType } from '@/lib/types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bank: 'Bank account',
  card: 'Credit card',
  e_wallet: 'E-wallet',
};

export function AccountForm({ account }: { account?: Account }) {
  const [state, action, pending] = useActionState(saveAccount, undefined);
  return (
    <form action={action} className="grid gap-3">
      {account && <input type="hidden" name="id" value={account.id} />}
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Name</span>
        <input name="name" defaultValue={account?.name} required maxLength={60} className="field" placeholder="e.g. KBank savings" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Type</span>
          <select name="type" defaultValue={account?.type ?? 'bank'} className="field">
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Bank</span>
          <select name="bank_code" defaultValue={account?.bank_code ?? ''} className="field">
            <option value="">None</option>
            {Object.entries(THAI_BANKS).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {state?.error && <p className="text-sm font-semibold text-expense" role="alert">{state.error}</p>}
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {account ? 'Save' : 'Add account'}
      </button>
    </form>
  );
}

export function ArchiveAccountButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn text-sm text-ink-soft" disabled={pending} onClick={() => start(() => setAccountArchived(id, !archived))}>
      {archived ? 'Show' : 'Hide'}
    </button>
  );
}
