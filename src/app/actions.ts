'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { endOfMonth, todayISO } from '@/lib/format';
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
 * Only income can count toward the following month.
 */
function typedFields(
  form: FormData,
): { error: string } | { fields: Record<string, string | boolean | null> & { type: TxnType } } {
  const type = str(form, 'type') as TxnType | null;
  if (!type || !TXN_TYPES.includes(type)) return { error: 'Choose money out, money in, or a transfer.' };
  const account_id = str(form, 'account_id');
  const for_next_month = type === 'income' && form.get('for_next_month') === 'on';
  if (type !== 'transfer') {
    if (!account_id) return { error: 'Pick the account this money went through.' };
    return {
      fields: { type, account_id, to_account_id: null, category_id: str(form, 'category_id'), merchant: str(form, 'merchant'), for_next_month },
    };
  }
  const to_account_id = str(form, 'to_account_id');
  if (!account_id || !to_account_id) return { error: 'Pick the account the money left and the one it went to.' };
  if (account_id === to_account_id) return { error: 'Pick two different accounts.' };
  return { fields: { type, account_id, to_account_id, category_id: null, merchant: null, for_next_month } };
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
 * `repeat` schedule the entry also becomes a recurring rule. A new one goes
 * through start_recurring, which logs it only if its date has come; an
 * existing entry is already logged and is turned into a rule (make_recurring).
 */
export async function saveTransaction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const amount = parseAmount(str(form, 'amount'));
  if (!amount) return { error: 'Enter an amount above zero.' };
  const typed = typedFields(form);
  if ('error' in typed) return typed;
  const repeat = parseRepeat(str(form, 'repeat'));
  const schedule = repeat && scheduleFor(repeat);

  const row = {
    ...typed.fields,
    amount,
    date: str(form, 'date') ?? undefined,
    note: str(form, 'note'),
    status: 'confirmed' as const,
  };

  const id = str(form, 'id');
  if (!id && schedule) {
    const today = todayISO();
    const date = row.date ?? today;
    const { error } = await supabase.rpc('start_recurring', {
      p_entry: { ...row, date },
      p_frequency: schedule.frequency,
      p_anchor_day: schedule.anchorDay,
    });
    if (error) return { error: error.message };
    refresh();
    // A date still to come logs nothing yet; the schedule is where it shows up.
    redirect(returnTo(form) ?? (date > today ? '/settings/recurring' : '/transactions'));
  }

  const { data: saved, error } = id
    ? await supabase.from('transactions').update(row).eq('id', id).select('id').single()
    : await supabase.from('transactions').insert({ ...row, source: 'manual' }).select('id').single();

  if (error) {
    return { error: error.code === '23505' ? 'That bank reference is already on another entry.' : error.message };
  }
  if (schedule) {
    const { error: repeatError } = await supabase.rpc('make_recurring', {
      p_transaction_id: saved.id,
      p_frequency: schedule.frequency,
      p_anchor_day: schedule.anchorDay,
    });
    if (repeatError) {
      refresh();
      return { error: `Saved, but it isn't repeating yet (${repeatError.message}). Pick the Repeat schedule again and save.` };
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

/** Edit a recurring rule. New ones are added through the entry form's Repeat (saveTransaction). */
export async function saveRecurring(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const id = str(form, 'id');
  if (!id) return { error: 'Add new repeating entries from the Add button.' };
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
  const { error } = await supabase.from('recurring_rules').update(row).eq('id', id);
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
    p_for_next_month: form.get('for_next_month') === 'on',
  });
  if (error) return { error: error.message };
  refresh();
  await continueOnboarding(form);
}

// ---------------------------------------------------------------------------
// Erase
// ---------------------------------------------------------------------------

// Storage's list and remove calls handle at most this many objects per request.
const STORAGE_PAGE = 1000;

/**
 * "Delete all my data": removes every slip photo under the user's folder, then
 * erase_my_data() deletes their rows and re-seeds a fresh start (onboarding
 * again). Photos go first so a failure there leaves the data intact.
 */
export async function eraseMyData(_prev: ActionResult): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const slips = supabase.storage.from('slips');

  // Slips live at {user_id}/{year}/{tx_id}.ext. Listing the folder (rather than
  // reading slip_path) also catches photos left behind by an interrupted upload.
  const paths: string[] = [];
  const { data: years, error: listError } = await slips.list(user.id, { limit: STORAGE_PAGE });
  if (listError) return { error: `Couldn't read your slip photos (${listError.message}). Nothing was deleted.` };
  for (const year of years ?? []) {
    for (let offset = 0; ; offset += STORAGE_PAGE) {
      const { data: files, error } = await slips.list(`${user.id}/${year.name}`, { limit: STORAGE_PAGE, offset });
      if (error) return { error: `Couldn't read your slip photos (${error.message}). Nothing was deleted.` };
      paths.push(...(files ?? []).map((f) => `${user.id}/${year.name}/${f.name}`));
      if (!files || files.length < STORAGE_PAGE) break;
    }
  }
  for (let i = 0; i < paths.length; i += STORAGE_PAGE) {
    const { error } = await slips.remove(paths.slice(i, i + STORAGE_PAGE));
    if (error) return { error: `Couldn't delete your slip photos (${error.message}). Your entries are still here; try again.` };
  }

  const { error } = await supabase.rpc('erase_my_data');
  if (error) return { error: error.message };
  refresh();
  redirect('/welcome');
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect('/login');
}
