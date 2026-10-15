'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { endOfMonth } from '@/lib/format';
import { parseRepeat, scheduleFor } from '@/lib/recurring';
import { requireUser } from '@/lib/supabase/server';
import { ONBOARDING_STEPS, type AccountType, type CategoryType, type OnboardingStep, type Profile, type TxnType } from '@/lib/types';

export type ActionResult = { error?: string } | undefined;

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};

/** A number as typed into a form ("45,000.50", "฿ 1 200"); NaN if it isn't one. */
const parseNumber = (raw: string) => Number(raw.replace(/[,\s฿]/g, ''));

function parseAmount(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseNumber(raw);
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
    if (!account_id) return { error: 'Pick the account this money went through.' };
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

/** In-app path from the form's `return_to`, never another origin. */
function returnTo(form: FormData): string | null {
  const path = str(form, 'return_to');
  return path?.startsWith('/') && !path.startsWith('//') ? path : null;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * Create (no id) or update a transaction. Saving always confirms it. With a
 * `repeat` schedule the entry also becomes a recurring rule (make_recurring).
 */
export async function saveTransaction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const amount = parseAmount(str(form, 'amount'));
  if (!amount) return { error: 'Enter an amount above zero.' };
  const typed = typedFields(form);
  if ('error' in typed) return typed;
  const repeat = parseRepeat(str(form, 'repeat'));

  const row = {
    ...typed.fields,
    amount,
    date: str(form, 'date') ?? undefined,
    note: str(form, 'note'),
    status: 'confirmed' as const,
  };

  const id = str(form, 'id');
  const { data: saved, error } = id
    ? await supabase.from('transactions').update(row).eq('id', id).select('id').single()
    : await supabase.from('transactions').insert({ ...row, source: 'manual' }).select('id').single();

  if (error) {
    return { error: error.code === '23505' ? 'That bank reference is already on another entry.' : error.message };
  }
  if (repeat) {
    const { frequency, anchorDay } = scheduleFor(repeat);
    const { error: repeatError } = await supabase.rpc('make_recurring', {
      p_transaction_id: saved.id,
      p_frequency: frequency,
      p_anchor_day: anchorDay,
    });
    if (repeatError) {
      refresh();
      return { error: `Saved, but it isn't repeating yet (${repeatError.message}). Set it up in Settings › Recurring.` };
    }
  }
  refresh();
  redirect(returnTo(form) ?? '/transactions');
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
  // Compared as numbers: the field shows "12,000" for a pre-filled 12000.
  const rawBalance = str(form, 'balance');
  const was = str(form, 'balance_was');
  const balance = rawBalance === null ? null : parseNumber(rawBalance);
  if (balance !== null && !Number.isFinite(balance)) return { error: 'Enter the balance as a number.' };
  const changed = balance !== (was === null ? null : parseNumber(was));

  const id = str(form, 'id');
  // Only banks issue bank accounts and cards; a bank code elsewhere would mislead slip matching.
  const row = { name, type, bank_code: type === 'bank' || type === 'card' ? str(form, 'bank_code') : null };
  const { data, error } = id
    ? await supabase.from('accounts').update(row).eq('id', id).select('id').single()
    : await supabase.from('accounts').insert(row).select('id').single();
  if (error) return { error: error.message };

  if (balance !== null && changed) {
    // Cards are entered as the amount owed and stored as a negative balance.
    const current = type === 'card' ? -Math.abs(balance) : balance;
    const { error: balError } = await supabase.rpc('set_account_balance', { p_account: data.id, p_balance: current });
    if (balError) return { error: balError.message };
  }
  refresh();
  await continueOnboarding(form);
}

export async function setAccountArchived(id: string, archived: boolean): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from('accounts').update({ archived }).eq('id', id);
  refresh();
}

export async function setDefaultAccount(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.rpc('set_default_account', { p_account: id });
  refresh();
}

// ---------------------------------------------------------------------------
// Recurring rules
// ---------------------------------------------------------------------------

export async function saveRecurring(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const amount = parseAmount(str(form, 'amount'));
  const picked = str(form, 'next_run_date');
  if (!amount) return { error: 'Enter an amount above zero.' };
  if (!picked) return { error: 'Pick the next due date.' };
  const typed = typedFields(form);
  if ('error' in typed) return typed;
  const { frequency, anchorDay } = scheduleFor(parseRepeat(str(form, 'repeat')) ?? 'monthly');
  // A month-end rule always falls on the last day, whichever day of the month was picked.
  const next = anchorDay ? endOfMonth(picked) : picked;

  const row = {
    ...typed.fields,
    amount,
    note: str(form, 'note'),
    frequency,
    next_run_date: next,
    anchor_day: anchorDay ?? Number(next.slice(8, 10)),
  };
  const id = str(form, 'id');
  const { error } = id
    ? await supabase.from('recurring_rules').update(row).eq('id', id)
    : await supabase.from('recurring_rules').insert(row);
  if (error) return { error: error.message };
  refresh();
  redirect(returnTo(form) ?? '/settings/recurring');
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
// Profile & onboarding
// ---------------------------------------------------------------------------

/**
 * Onboarding forms carry the step they answer in `onboarding_step`. Once the
 * answer is saved, finish that step and show the next one (or the dashboard).
 */
async function continueOnboarding(form: FormData): Promise<void> {
  const step = str(form, 'onboarding_step');
  if (!ONBOARDING_STEPS.some((s) => s === step)) return;
  const { supabase } = await requireUser();
  await supabase.rpc('finish_onboarding_step', { p_step: step });
  refresh();
  redirect('/welcome');
}

export async function skipOnboardingStep(step: OnboardingStep): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.rpc('finish_onboarding_step', { p_step: step });
  refresh();
  redirect('/welcome');
}

/** Name and monthly budget. Only fields present in the form change; a blank field clears it. */
export async function saveProfile(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const row: Partial<Pick<Profile, 'display_name' | 'monthly_budget'>> = {};
  if (form.has('display_name')) {
    const name = str(form, 'display_name');
    if (name && name.length > 40) return { error: 'Keep the name to 40 characters.' };
    row.display_name = name;
  }
  if (form.has('monthly_budget')) {
    const raw = str(form, 'monthly_budget');
    const budget = parseAmount(raw);
    if (raw && !budget) return { error: 'Enter the budget as an amount above zero.' };
    row.monthly_budget = budget;
  }
  const { error } = await supabase.from('profiles').update(row).eq('user_id', user.id);
  if (error) return { error: error.message };
  refresh();
  await continueOnboarding(form);
}

/** A monthly salary from onboarding: becomes an income rule, and this month's pay is logged if it already came in. */
export async function saveSalary(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const amount = parseAmount(str(form, 'amount'));
  if (!amount) return { error: 'Enter your salary as an amount above zero.' };
  const payday = Number(str(form, 'payday'));
  if (!Number.isInteger(payday) || payday < 1 || payday > 31) return { error: 'Pick your payday.' };
  const account = str(form, 'account_id');
  if (!account) return { error: 'Pick the account your salary goes into.' };
  const { error } = await supabase.rpc('start_salary', {
    p_amount: amount,
    p_anchor_day: payday,
    p_account: account,
    p_category: str(form, 'category_id'),
    p_already_paid: form.get('already_paid') === 'on',
  });
  if (error) return { error: error.message };
  refresh();
  await continueOnboarding(form);
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect('/login');
}
