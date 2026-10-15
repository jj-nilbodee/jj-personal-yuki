'use client';

import { useActionState, useState, useTransition } from 'react';
import { saveAccount, setAccountArchived, setDefaultAccount } from '@/app/actions';
import { AmountInput } from '@/components/amount-input';
import { ACCOUNT_TYPE_LABELS } from '@/lib/accounts';
import { THAI_BANKS } from '@/lib/slip/qr';
import type { AccountBalance, AccountType } from '@/lib/types';

/** Add or edit an account. In onboarding, saving the first account moves on to the next step. */
export function AccountForm({ account, onboarding }: { account?: AccountBalance; onboarding?: boolean }) {
  const [state, action, pending] = useActionState(saveAccount, undefined);
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank');
  // Cards are shown and entered as the amount owed (a positive number).
  const shown = account ? String(account.type === 'card' ? Math.abs(account.balance) : account.balance) : '';

  return (
    <form action={action} className="grid gap-3">
      {account && <input type="hidden" name="id" value={account.id} />}
      {onboarding && <input type="hidden" name="onboarding_step" value="account" />}
      {account && <input type="hidden" name="balance_was" value={shown} />}
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Name</span>
        <input name="name" defaultValue={account?.name} required maxLength={60} className="field" placeholder="e.g. KBank savings, TrueMoney" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Type</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as AccountType)} className="field">
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(type === 'bank' || type === 'card') && (
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
        )}
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">{type === 'card' ? 'Amount owed now (฿)' : 'Balance now (฿)'}</span>
        {/* A bank or wallet can be overdrawn; a card is entered as the (positive) amount owed. */}
        <AmountInput name="balance" defaultValue={shown} allowNegative={type !== 'card'} placeholder="0.00" className="field num" />
      </label>
      {state?.error && <p className="text-sm font-semibold text-expense" role="alert">{state.error}</p>}
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {onboarding ? 'Continue' : account ? 'Save' : 'Add account'}
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

export function MakeDefaultButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-quiet justify-self-start" disabled={pending} onClick={() => start(() => setDefaultAccount(id))}>
      Make default
    </button>
  );
}
