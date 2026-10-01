'use client';

import { useActionState, useState, useTransition } from 'react';
import { deleteRecurring, saveRecurring } from '@/app/actions';
import { todayISO } from '@/lib/format';
import type { Account, Category, RecurringRule, TxnType } from '@/lib/types';

export function RuleForm({ rule, categories, accounts }: { rule?: RecurringRule; categories: Category[]; accounts: Account[] }) {
  const [state, action, pending] = useActionState(saveRecurring, undefined);
  const [type, setType] = useState<TxnType>(rule?.type ?? 'expense');
  const [deleting, startDelete] = useTransition();

  return (
    <form action={action} className="grid gap-4">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Type</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as TxnType)} className="field">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Amount (฿)</span>
          <input name="amount" inputMode="decimal" required defaultValue={rule?.amount} className="field num" />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">{type === 'income' ? 'From' : 'Paid to'}</span>
        <input name="merchant" defaultValue={rule?.merchant ?? ''} className="field" placeholder="e.g. Rent, Netflix" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Repeats</span>
          <select name="frequency" defaultValue={rule?.frequency ?? 'monthly'} className="field">
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
            <option value="yearly">Every year</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Next due</span>
          <input type="date" name="next_run_date" required min={todayISO()} defaultValue={rule?.next_run_date ?? todayISO()} className="field" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Account</span>
          <select name="account_id" defaultValue={rule?.account_id ?? ''} className="field">
            <option value="">None</option>
            {accounts
              .filter((a) => !a.archived)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
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
          Save
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
