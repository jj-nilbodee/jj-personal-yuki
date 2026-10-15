'use client';

import { useActionState, useState, useTransition } from 'react';
import { deleteRecurring, saveRecurring } from '@/app/actions';
import { AccountOptions } from '@/components/account-options';
import { todayISO } from '@/lib/format';
import { REPEAT_LABEL, REPEATS, repeatOf } from '@/lib/recurring';
import type { Account, Category, RecurringRule, TxnType } from '@/lib/types';

/** Create or edit a recurring rule. `returnTo` keeps the user on that page after saving (onboarding's bills step). */
export function RuleForm({
  rule,
  categories,
  accounts,
  returnTo,
}: {
  rule?: RecurringRule;
  categories: Category[];
  accounts: Account[];
  returnTo?: string;
}) {
  const [state, action, pending] = useActionState(saveRecurring, undefined);
  const [type, setType] = useState<TxnType>(rule?.type ?? 'expense');
  const [deleting, startDelete] = useTransition();

  return (
    <form action={action} className="grid gap-4">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Type</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as TxnType)} className="field">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Amount (฿)</span>
          <input name="amount" inputMode="decimal" required defaultValue={rule?.amount} className="field num" />
        </label>
      </div>
      {type !== 'transfer' && (
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">{type === 'income' ? 'From' : 'Paid to'}</span>
          <input name="merchant" defaultValue={rule?.merchant ?? ''} className="field" placeholder="e.g. Rent, Netflix" />
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Repeats</span>
          <select name="repeat" defaultValue={rule ? repeatOf(rule) : 'monthly'} className="field">
            {REPEATS.map((r) => (
              <option key={r} value={r}>
                {REPEAT_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Next due</span>
          <input type="date" name="next_run_date" required min={todayISO()} defaultValue={rule?.next_run_date ?? todayISO()} className="field" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {type === 'transfer' ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">To account</span>
            <select name="to_account_id" defaultValue={rule?.to_account_id ?? ''} className="field" required>
              <option value="">Choose</option>
              <AccountOptions accounts={accounts} selected={rule?.to_account_id} />
            </select>
          </label>
        ) : (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">Category</span>
            <select name="category_id" defaultValue={rule?.category_id ?? ''} className="field" key={type}>
              <option value="">None</option>
              {categories
                .filter((c) => c.type === type && !c.archived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="grid gap-1.5 -order-1">
          <span className="text-sm font-semibold">{type === 'transfer' ? 'From account' : 'Account'}</span>
          <select
            name="account_id"
            defaultValue={rule?.account_id ?? accounts.find((a) => a.is_default && !a.archived)?.id ?? ''}
            className="field"
            required
          >
            <option value="">Choose</option>
            <AccountOptions accounts={accounts} selected={rule?.account_id} />
          </select>
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Note</span>
        <input name="note" defaultValue={rule?.note ?? ''} className="field" />
      </label>
      {state?.error && <p className="text-sm font-semibold text-expense" role="alert">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {returnTo ? 'Add' : 'Save'}
        </button>
        {rule && (
          <button type="button" className="btn text-ink-soft" disabled={deleting} onClick={() => startDelete(() => deleteRecurring(rule.id))}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
