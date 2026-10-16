'use client';

import { useActionState, useState } from 'react';
import { saveSalary } from '@/app/actions';
import { AccountOptions } from '@/components/account-options';
import { AmountInput } from '@/components/amount-input';
import { NextMonthToggle } from '@/components/next-month-toggle';
import { endOfMonth, formatDay, todayISO } from '@/lib/format';
import { MONTH_END_ANCHOR, ordinal } from '@/lib/recurring';
import type { Account } from '@/lib/types';

const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

export function SalaryForm({ accounts, categoryId }: { accounts: Account[]; categoryId: string | null }) {
  const [state, action, pending] = useActionState(saveSalary, undefined);
  const [payday, setPayday] = useState('');
  const [forNextMonth, setForNextMonth] = useState(false);
  const today = todayISO();
  // A month's payday, clamped to its length like the rule itself (31 = last day).
  const paydayIn = (monthIso: string) => {
    const end = endOfMonth(monthIso);
    return `${end.slice(0, 8)}${String(Math.min(Number(payday), Number(end.slice(8)))).padStart(2, '0')}`;
  };
  const lastMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1)).toISOString().slice(0, 10);
  // What "already paid" logs, matching start_salary(): this month's payday once it has
  // passed and, for pay that covers the month after, last month's payday too.
  const loggable =
    payday === ''
      ? []
      : [...(forNextMonth ? [paydayIn(lastMonth)] : []), ...(paydayIn(today) <= today ? [paydayIn(today)] : [])];

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="onboarding_step" value="salary" />
      {categoryId && <input type="hidden" name="category_id" value={categoryId} />}
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Amount (฿)</span>
        <AmountInput name="amount" required placeholder="0.00" className="field num" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Payday</span>
          <select name="payday" required value={payday} onChange={(e) => setPayday(e.target.value)} className="field">
            <option value="">Choose</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                The {ordinal(d)}
              </option>
            ))}
            <option value={MONTH_END_ANCHOR}>Last day of the month</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Paid into</span>
          <select
            name="account_id"
            required
            defaultValue={accounts.find((a) => a.is_default && !a.archived)?.id ?? ''}
            className="field"
          >
            <option value="">Choose</option>
            <AccountOptions accounts={accounts} />
          </select>
        </label>
      </div>
      <NextMonthToggle checked={forNextMonth} onChange={setForNextMonth} />
      {loggable.length > 0 && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="already_paid" className="size-5 shrink-0 accent-accent" />
          <span>Already paid on {loggable.map((d) => formatDay(d)).join(' and ')}</span>
        </label>
      )}
      {state?.error && (
        <p className="text-sm font-semibold text-expense" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        Continue
      </button>
    </form>
  );
}
