'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';
import type { AccountType, CategoryType, Frequency, TxnType } from '@/lib/types';

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

const TXN_TYPES: TxnType[] = ['expense', 'income', 'transfer'];

/**
 * Type plus the fields that depend on it. A transfer moves money between two of
 * the user's own accounts, so it has a destination and never a category or payee.
 */
function typedFields(form: FormData): { error: string } | { fields: Record<string, string | null> & { type: TxnType } } {
  const type = str(form, 'type') as TxnType | null;
  if (!type || !TXN_TYPES.includes(type)) return { error: 'Choose money out, money in, or a transfer.' };
  const account_id = str(form, 'account_id');
  if (type !== 'transfer') {
    return { fields: { type, account_id, to_account_id: null, category_id: str(form, 'category_id'), merchant: str(form, 'merchant') } };
  }
  const to_account_id = str(form, 'to_account_id');
  if (!account_id || !to_account_id) return { error: 'Pick the account the money left and the one it went to.' };
  if (account_id === to_account_id) return { error: 'Pick two different accounts.' };
  return { fields: { type, account_id, to_account_id, category_id: null, merchant: null } };
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
  const typed = typedFields(form);
  if ('error' in typed) return typed;

  const row = {
    ...typed.fields,
    amount,
    date: str(form, 'date') ?? undefined,
    note: str(form, 'note'),
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
  const row = { name, type: (str(form, 'type') ?? 'expense') as CategoryType, icon: str(form, 'icon') ?? 'circle' };
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
  const type = (str(form, 'type') ?? 'bank') as AccountType;
  // The edit form pre-fills the balance; only apply it if the user changed it,
  // so renaming an account never resets a balance that moved since page load.
  const rawBalance = str(form, 'balance');
  const changed = rawBalance !== str(form, 'balance_was');
  const balance = rawBalance === null || !changed ? null : Number(rawBalance.replace(/[,\s฿]/g, ''));
  if (balance !== null && !Number.isFinite(balance)) return { error: 'Enter the balance as a number.' };

  const id = str(form, 'id');
  // Only banks issue bank accounts and cards; a bank code elsewhere would mislead slip matching.
  const row = { name, type, bank_code: type === 'bank' || type === 'card' ? str(form, 'bank_code') : null };
  const { data, error } = id
    ? await supabase.from('accounts').update(row).eq('id', id).select('id').single()
    : await supabase.from('accounts').insert(row).select('id').single();
  if (error) return { error: error.message };

  if (balance !== null) {
    // Cards are entered as the amount owed and stored as a negative balance.
    const current = type === 'card' ? -Math.abs(balance) : balance;
    const { error: balError } = await supabase.rpc('set_account_balance', { p_account: data.id, p_balance: current });
    if (balError) return { error: balError.message };
  }
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
  const typed = typedFields(form);
  if ('error' in typed) return typed;

  const row = {
    ...typed.fields,
    amount,
    note: str(form, 'note'),
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
