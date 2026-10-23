'use client';

import { useActionState, useState, useTransition } from 'react';
import { deleteRecurring, saveRecurring } from '@/app/actions';
import { AccountOptions } from '@/components/account-options';
import { AmountInput } from '@/components/amount-input';
import { NextMonthToggle } from '@/components/next-month-toggle';
import { todayISO } from '@/lib/format';
import { REPEAT_LABEL, REPEATS, repeatOf } from '@/lib/recurring';
import type { Account, Category, RecurringRule, TxnType } from '@/lib/types';

/** Edit a recurring rule. New ones start from the entry form's Repeat schedule. */
export function RuleForm({ rule, categories, accounts }: { rule: RecurringRule; categories: Category[]; accounts: Account[] }) {
  const [state, action, pending] = useActionState(saveRecurring, undefined);
  const [type, setType] = useState<TxnType>(rule.type);
  const [deleting, startDelete] = useTransition();

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={rule.id} />
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
          <AmountInput name="amount" required defaultValue={rule.amount} className="field num" />
        </label>
      </div>
      {type === 'income' && <NextMonthToggle defaultChecked={rule.for_next_month} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Repeats</span>
          <select name="repeat" defaultValue={repeatOf(rule)} className="field">
            {REPEATS.map((r) => (
              <option key={r} value={r}>
                {REPEAT_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Next due</span>
          <input type="date" name="next_run_date" required min={todayISO()} defaultValue={rule.next_run_date} className="field" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {type === 'transfer' ? (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">To account</span>
            <select name="to_account_id" defaultValue={rule.to_account_id ?? ''} className="field" required>
              <option value="">Choose</option>
              <AccountOptions accounts={accounts} selected={rule.to_account_id} />
            </select>
          </label>
        ) : (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">Category</span>
            <select name="category_id" defaultValue={rule.category_id ?? ''} className="field" key={type}>
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
          <select name="account_id" defaultValue={rule.account_id ?? ''} className="field" required>
            <option value="">Choose</option>
            <AccountOptions accounts={accounts} selected={rule.account_id} />
          </select>
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Note</span>
        <input name="note" defaultValue={rule.note ?? ''} className="field" placeholder="e.g. Rent, Netflix" />
      </label>
      {state?.error && <p className="text-sm font-semibold text-expense" role="alert">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          Save
        </button>
        <button type="button" className="btn text-ink-soft" disabled={deleting} onClick={() => startDelete(() => deleteRecurring(rule.id))}>
          Delete
        </button>
      </div>
    </form>
  );
}
