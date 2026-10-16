'use client';

import { useActionState, useState, useTransition } from 'react';
import { deleteRecurring, saveRecurring } from '@/app/actions';
import { AccountOptions } from '@/components/account-options';
import { AmountInput } from '@/components/amount-input';
import { NextMonthToggle } from '@/components/next-month-toggle';
import { endOfMonth, formatDay, todayISO } from '@/lib/format';
import { REPEAT_LABEL, REPEATS, type Repeat, repeatOf } from '@/lib/recurring';
import type { Account, Category, RecurringRule, TxnType } from '@/lib/types';

/**
 * Create or edit a recurring rule. In `onboarding` (the bills step) a new rule may
 * start earlier this month, with that payment already made, and saving stays on /welcome.
 */
export function RuleForm({
  rule,
  categories,
  accounts,
  onboarding = false,
}: {
  rule?: RecurringRule;
  categories: Category[];
  accounts: Account[];
  onboarding?: boolean;
}) {
  const [state, action, pending] = useActionState(saveRecurring, undefined);
  const [type, setType] = useState<TxnType>(rule?.type ?? 'expense');
  const [repeat, setRepeat] = useState<Repeat>(rule ? repeatOf(rule) : 'monthly');
  const today = todayISO();
  const [due, setDue] = useState(rule?.next_run_date ?? today);
  const [deleting, startDelete] = useTransition();
  // What "already paid" logs, matching start_recurring(): every due date from the first
  // through today. Monthly and yearly rules starting this month are next due after today.
  const first = repeat === 'month_end' && due ? endOfMonth(due) : due;
  const loggable: string[] = [];
  if (onboarding && first && first <= today) {
    if (repeat !== 'weekly') loggable.push(first);
    else for (let d = first; d <= today; d = new Date(Date.parse(`${d}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10)) loggable.push(d);
  }

  return (
    <form action={action} className="grid gap-4">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      {onboarding && <input type="hidden" name="return_to" value="/welcome" />}
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
          <AmountInput name="amount" required defaultValue={rule?.amount} className="field num" />
        </label>
      </div>
      {type !== 'transfer' && (
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">{type === 'income' ? 'From' : 'Paid to'}</span>
          <input name="merchant" defaultValue={rule?.merchant ?? ''} className="field" placeholder="e.g. Rent, Netflix" />
        </label>
      )}
      {type === 'income' && <NextMonthToggle defaultChecked={rule?.for_next_month} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Repeats</span>
          <select name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} className="field">
            {REPEATS.map((r) => (
              <option key={r} value={r}>
                {REPEAT_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">{onboarding ? 'Due on' : 'Next due'}</span>
          <input
            type="date"
            name="next_run_date"
            required
            min={onboarding ? `${today.slice(0, 8)}01` : today}
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="field"
          />
        </label>
      </div>
      {loggable.length > 0 && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="already_paid" className="size-5 shrink-0 accent-accent" />
          <span>Already paid on {new Intl.ListFormat('en-GB').format(loggable.map((d) => formatDay(d, today)))}</span>
        </label>
      )}
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
          {onboarding ? 'Add' : 'Save'}
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
