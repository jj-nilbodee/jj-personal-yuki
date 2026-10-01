'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';
import type { AccountType, Frequency, TxnType } from '@/lib/types';

export type ActionResult = { error?: string } | undefined;

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};

function parseAmount(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[,\s฿]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function refresh() {
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/** Create (no id) or update a transaction. Saving always confirms it. */
export async function saveTransaction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const amount = parseAmount(str(form, 'amount'));
  if (!amount) return { error: 'Enter an amount above zero.' };

  const row = {
    type: (str(form, 'type') ?? 'expense') as TxnType,
    amount,
    date: str(form, 'date') ?? undefined,
    merchant: str(form, 'merchant'),
    note: str(form, 'note'),
    category_id: str(form, 'category_id'),
    account_id: str(form, 'account_id'),
    status: 'confirmed' as const,
  };

  const id = str(form, 'id');
  const { error } = id
    ? await supabase.from('transactions').update(row).eq('id', id)
    : await supabase.from('transactions').insert({ ...row, source: 'manual' });

  if (error) {
    return { error: error.code === '23505' ? 'That bank reference is already on another entry.' : error.message };
  }
  refresh();
  const returnTo = str(form, 'return_to');
  redirect(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/transactions');
}

export async function deleteTransaction(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from('transactions').delete().eq('id', id).select('slip_path').maybeSingle();
  if (data?.slip_path) await supabase.storage.from('slips').remove([data.slip_path]);
  refresh();
  redirect('/transactions');
}

// ---------------------------------------------------------------------------
// Categories & accounts
// ---------------------------------------------------------------------------

export async function saveCategory(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const name = str(form, 'name');
  if (!name) return { error: 'Give the category a name.' };
  const id = str(form, 'id');
  const row = { name, type: (str(form, 'type') ?? 'expense') as TxnType, icon: str(form, 'icon') ?? 'circle' };
  const { error } = id
    ? await supabase.from('categories').update(row).eq('id', id)
    : await supabase.from('categories').insert(row);
  if (error) return { error: error.code === '23505' ? `There's already a category called ${name}.` : error.message };
  refresh();
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from('categories').update({ archived }).eq('id', id);
  refresh();
}

export async function saveAccount(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const name = str(form, 'name');
  if (!name) return { error: 'Give the account a name.' };
  const id = str(form, 'id');
  const row = { name, type: (str(form, 'type') ?? 'bank') as AccountType, bank_code: str(form, 'bank_code') };
  const { error } = id
    ? await supabase.from('accounts').update(row).eq('id', id)
    : await supabase.from('accounts').insert(row);
  if (error) return { error: error.message };
  refresh();
}

export async function setAccountArchived(id: string, archived: boolean): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from('accounts').update({ archived }).eq('id', id);
  refresh();
}

// ---------------------------------------------------------------------------
// Recurring rules
// ---------------------------------------------------------------------------

export async function saveRecurring(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const amount = parseAmount(str(form, 'amount'));
  const next = str(form, 'next_run_date');
  if (!amount) return { error: 'Enter an amount above zero.' };
  if (!next) return { error: 'Pick the next due date.' };

  const row = {
    type: (str(form, 'type') ?? 'expense') as TxnType,
    amount,
    merchant: str(form, 'merchant'),
    note: str(form, 'note'),
    category_id: str(form, 'category_id'),
    account_id: str(form, 'account_id'),
    frequency: (str(form, 'frequency') ?? 'monthly') as Frequency,
    next_run_date: next,
    anchor_day: Number(next.slice(8, 10)),
  };
  const id = str(form, 'id');
  const { error } = id
    ? await supabase.from('recurring_rules').update(row).eq('id', id)
    : await supabase.from('recurring_rules').insert(row);
  if (error) return { error: error.message };
  refresh();
  redirect('/settings/recurring');
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from('recurring_rules').update({ active }).eq('id', id);
  refresh();
}

export async function deleteRecurring(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from('recurring_rules').delete().eq('id', id);
  refresh();
  redirect('/settings/recurring');
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect('/login');
}
