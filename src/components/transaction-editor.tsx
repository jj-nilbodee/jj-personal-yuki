'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Maximize2, RotateCcw, Trash2, X } from 'lucide-react';
import { deleteTransaction, saveTransaction } from '@/app/actions';
import { formatDay, formatMoney, todayISO } from '@/lib/format';
import { THAI_BANKS } from '@/lib/slip/qr';
import type { Account, Category, Extraction, Transaction, TxnType } from '@/lib/types';
import { AccountOptions } from './account-options';
import { CategoryIcon } from './category-icon';
import { PawProgress } from './yuki';

type Fields = {
  type: TxnType | ''; // '' on a slip draft until the user says which way the money went
  amount: string;
  date: string;
  merchant: string;
  category_id: string;
  account_id: string;
  to_account_id: string;
  note: string;
};

function fieldsFrom(tx?: Partial<Transaction>): Fields {
  return {
    type: tx ? (tx.type ?? '') : 'expense',
    amount: tx?.amount != null ? String(tx.amount) : '',
    date: tx?.date ?? todayISO(),
    merchant: tx?.merchant ?? '',
    category_id: tx?.category_id ?? '',
    account_id: tx?.account_id ?? '',
    to_account_id: tx?.to_account_id ?? '',
    note: tx?.note ?? '',
  };
}

const TYPES = [
  { type: 'expense', label: 'Expense', Icon: ArrowUpRight, color: 'text-expense' },
  { type: 'income', label: 'Income', Icon: ArrowDownLeft, color: 'text-income' },
  { type: 'transfer', label: 'Transfer', Icon: ArrowLeftRight, color: 'text-ink' },
] as const;

export function TransactionEditor({
  tx,
  categories,
  accounts,
  slipUrl,
}: {
  tx?: Transaction;
  categories: Category[];
  accounts: Account[];
  slipUrl?: string | null;
}) {
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(tx));
  const touched = useRef(new Set<keyof Fields>());
  const [status, setStatus] = useState(tx?.status ?? 'confirmed');
  const [extraction, setExtraction] = useState<Extraction | null>(tx?.extraction ?? null);
  const [state, formAction, saving] = useActionState(saveTransaction, undefined);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  const set = (key: keyof Fields, value: string) => {
    touched.current.add(key);
    setFields((f) => ({ ...f, [key]: value }));
  };

  /** Fill untouched fields with what the slip suggested for the chosen direction. */
  function withSuggestion(f: Fields, ex: Extraction | null): Fields {
    const suggestion = f.type ? ex?.suggested?.[f.type] : undefined;
    if (!suggestion) return f;
    const next = { ...f };
    for (const k of ['merchant', 'category_id', 'account_id'] as const) {
      if (!touched.current.has(k)) next[k] = suggestion[k] ?? '';
    }
    return next;
  }

  async function extract() {
    if (!tx) return;
    setStatus('processing');
    try {
      const res = await fetch(`/api/slips/${tx.id}/extract`, { method: 'POST' });
      const { transaction } = (await res.json()) as { transaction?: Transaction };
      if (!res.ok || !transaction) throw new Error('extract failed');
      // Fill fields in place, but never overwrite something the user already typed.
      const next = fieldsFrom(transaction);
      setFields((f) => {
        const merged = { ...f };
        (Object.keys(next) as (keyof Fields)[]).forEach((k) => {
          if (!touched.current.has(k)) (merged[k] as string) = next[k];
        });
        // The user may have picked a direction while the slip was still being read.
        return withSuggestion(merged, transaction.extraction);
      });
      setExtraction(transaction.extraction);
      setStatus(transaction.status);
    } catch {
      setExtraction((e) => ({ ...e, error: 'unreadable' }));
      setStatus('needs_review');
    }
  }

  useEffect(() => {
    if (tx?.status === 'processing' && !started.current) {
      started.current = true;
      void extract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseType(type: TxnType) {
    if (type === fields.type) return;
    touched.current.add('type');
    // A category belongs to one type, so it never carries over to another.
    touched.current.delete('category_id');
    setFields((f) => {
      const next = { ...f, type, category_id: '', to_account_id: type === 'transfer' ? f.to_account_id : '' };
      // On a slip draft, swap in what the slip suggests for this direction (payee vs payer, account).
      return status === 'confirmed' ? next : withSuggestion(next, extraction);
    });
  }

  const visibleCategories = categories.filter((c) => c.type === fields.type && (!c.archived || c.id === fields.category_id));
  const isTransfer = fields.type === 'transfer';
  const qr = extraction?.qr;

  return (
    <div className="grid gap-5">
      {tx?.slip_path && (
        <section className="card flex items-center gap-4 p-3">
          {slipUrl ? (
            <button type="button" onClick={() => setPreviewOpen(true)} className="relative shrink-0" aria-label="View slip full screen">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img src={slipUrl} alt="Slip" className="h-24 w-18 rounded-xl object-cover" />
              <Maximize2 className="absolute right-1 bottom-1 size-4 rounded bg-surface/80 p-0.5" aria-hidden />
            </button>
          ) : (
            <div className="h-24 w-18 rounded-xl bg-bg" />
          )}
          <div className="grid min-w-0 gap-1 text-sm">
            {status === 'processing' ? (
              <PawProgress />
            ) : (
              <span className="text-ink-soft">
                {tx.source === 'qr' ? 'Read from the slip QR code and photo' : 'Read from the photo'}
              </span>
            )}
            {qr && (
              <span className="num truncate text-ink-soft">
                {THAI_BANKS[qr.bankCode] ?? `Bank ${qr.bankCode}`} · Ref {qr.ref}
              </span>
            )}
          </div>
        </section>
      )}

      {status !== 'processing' && extraction?.error && (
        <section className="card grid gap-3 p-4">
          <p>
            {extraction.error === 'unavailable'
              ? 'Automatic reading isn’t set up yet. Enter this one yourself.'
              : 'Couldn’t read this one clearly. Retry or enter it yourself.'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-quiet" onClick={extract}>
              <RotateCcw className="size-4" aria-hidden /> Retry
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => amountRef.current?.focus()}>
              Enter manually
            </button>
          </div>
        </section>
      )}

      {extraction?.duplicateOf && (
        <p className="card p-4">
          This slip may already be logged on {formatDay(extraction.duplicateOf.date)} for{' '}
          <span className="num font-semibold">{formatMoney(extraction.duplicateOf.amount)}</span>.{' '}
          <Link href={`/transactions/${extraction.duplicateOf.id}`} className="font-semibold text-accent">
            Open it
          </Link>
        </p>
      )}

      <form action={formAction} className="grid gap-5">
        {tx && <input type="hidden" name="id" value={tx.id} />}
        <input type="hidden" name="type" value={fields.type} />
        <input type="hidden" name="category_id" value={fields.category_id} />

        <div className="grid gap-2">
          {fields.type === '' && (
            <p id="type-question" className="font-semibold">
              Money out, money in, or a move between your own accounts?
            </p>
          )}
          <fieldset
            className={`grid grid-cols-3 gap-1 rounded-full bg-surface p-1 ${fields.type === '' ? 'ring-2 ring-accent' : ''}`}
            aria-label="Type"
            aria-describedby={fields.type === '' ? 'type-question' : undefined}
          >
            {TYPES.map(({ type, label, Icon, color }) => (
              <button
                key={type}
                type="button"
                aria-pressed={fields.type === type}
                onClick={() => chooseType(type)}
                className={`btn px-2 ${fields.type === type ? 'btn-quiet' : 'text-ink-soft'}`}
              >
                <Icon className={`size-4 shrink-0 ${color}`} aria-hidden />
                {label}
              </button>
            ))}
          </fieldset>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Amount</span>
          <div className="relative">
            <span className="num pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl text-ink-soft">฿</span>
            <input
              ref={amountRef}
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              value={fields.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              className="field num h-16 pl-10 text-3xl"
              autoFocus={!tx}
            />
          </div>
        </label>

        {(fields.type === 'expense' || fields.type === 'income') && (
          <div className="grid gap-1.5">
            <span className="font-display text-sm font-semibold" id="category-label">
              Category
            </span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="category-label">
              {visibleCategories.map((c) => {
                const selected = fields.category_id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set('category_id', selected ? '' : c.id)}
                    className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${
                      selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface text-ink-soft'
                    }`}
                  >
                    <CategoryIcon name={c.icon} className="size-4" />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className={`grid gap-1.5 ${isTransfer ? 'col-span-2' : ''}`}>
            <span className="text-sm font-semibold">Date</span>
            <input type="date" name="date" required value={fields.date} onChange={(e) => set('date', e.target.value)} className="field" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">{isTransfer ? 'From account' : 'Account'}</span>
            <select
              name="account_id"
              value={fields.account_id}
              onChange={(e) => set('account_id', e.target.value)}
              className="field"
              required={isTransfer}
            >
              <option value="">{isTransfer ? 'Choose' : 'None'}</option>
              <AccountOptions accounts={accounts} selected={fields.account_id} />
            </select>
          </label>
          {isTransfer && (
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">To account</span>
              <select
                name="to_account_id"
                value={fields.to_account_id}
                onChange={(e) => set('to_account_id', e.target.value)}
                className="field"
                required
              >
                <option value="">Choose</option>
                <AccountOptions accounts={accounts} selected={fields.to_account_id} />
              </select>
            </label>
          )}
        </div>

        {!isTransfer && (
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold">{fields.type === 'income' ? 'From' : 'Paid to'}</span>
            <input name="merchant" value={fields.merchant} onChange={(e) => set('merchant', e.target.value)} className="field" autoComplete="off" />
          </label>
        )}

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Note</span>
          <textarea name="note" rows={2} value={fields.note} onChange={(e) => set('note', e.target.value)} className="field" />
        </label>

        {state?.error && (
          <p role="alert" className="text-sm font-semibold text-expense">
            {state.error}
          </p>
        )}

        <button className="btn btn-primary h-13 text-base" disabled={saving || fields.type === ''}>
          {status === 'confirmed' ? 'Save' : 'Looks right, save'}
        </button>
      </form>

      {tx && (
        <div className="flex justify-center">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Delete this entry{tx.slip_path ? ' and its slip' : ''}?</span>
              <button className="btn text-expense" disabled={deleting} onClick={() => startDelete(() => deleteTransaction(tx.id))}>
                Delete
              </button>
              <button className="btn" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button className="btn text-ink-soft" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </button>
          )}
        </div>
      )}

      {previewOpen && slipUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" role="dialog" aria-modal aria-label="Slip">
          <button className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 grid size-11 place-items-center rounded-full bg-surface" onClick={() => setPreviewOpen(false)} aria-label="Close" autoFocus>
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
          <img src={slipUrl} alt="Slip, full size" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
