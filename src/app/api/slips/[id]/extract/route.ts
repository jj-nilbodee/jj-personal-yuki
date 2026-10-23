import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractSlipFields } from '@/lib/slip/extract';
import type { Category, CategoryType, Extraction, SlipFields, Suggestion, Transaction } from '@/lib/types';

const MIN_CONFIDENCE = 0.5;

// Step 2 of the slip flow: read the stored photo with Gemini and fill in what
// the QR code doesn't carry (amount, date, who was paid). Safe to call again to retry.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).single<Transaction>();
  if (!tx?.slip_path) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (tx.status === 'confirmed') return NextResponse.json({ transaction: tx });

  await supabase.from('transactions').update({ status: 'processing' }).eq('id', id);

  const [{ data: file }, { data: categories }, { data: bankAccounts }] = await Promise.all([
    supabase.storage.from('slips').download(tx.slip_path),
    supabase.from('categories').select('id, name, type').eq('archived', false).returns<Category[]>(),
    tx.sending_bank_code && !tx.account_id
      ? supabase.from('accounts').select('id').eq('bank_code', tx.sending_bank_code).eq('archived', false)
      : Promise.resolve({ data: null }),
  ]);

  const extraction: Extraction = { qr: tx.extraction?.qr ?? null, ocr: null, error: null };
  let ocr: SlipFields | null = null;
  try {
    if (!file) throw new Error('slip missing');
    const names = (type: CategoryType) => (categories ?? []).filter((c) => c.type === type).map((c) => c.name);
    ocr = await extractSlipFields(
      { data: Buffer.from(await file.arrayBuffer()), mimeType: file.type || 'image/webp' },
      { expense: names('expense'), income: names('income') },
    );
    if (!ocr) extraction.error = 'unavailable';
    else if (ocr.amount === null || ocr.confidence < MIN_CONFIDENCE) extraction.error = 'unreadable';
  } catch (err) {
    console.error('slip extraction failed', id, err);
    extraction.error = 'unreadable';
  }
  extraction.ocr = ocr;

  const update: Partial<Transaction> = { status: 'needs_review', extraction };

  // The slip alone doesn't say whether the user sent or received the money, so
  // prepare fields for each direction; the editor applies the one the user picks.
  // The QR names the sending bank; if exactly one account is at that bank, the
  // money left that account (an expense, or the "from" side of a transfer).
  const sendingAccount = bankAccounts?.length === 1 ? bankAccounts[0].id : null;
  const suggestCategory = async (type: CategoryType, party: string | null, modelPick: string | null) => {
    // Prefer the category an entry with this note got last time; fall back to the model's pick.
    const fromHistory = party ? (await supabase.rpc('suggest_category', { p_note: party, p_type: type })).data : null;
    return fromHistory ?? categories?.find((c) => c.type === type && c.name === modelPick)?.id ?? null;
  };
  const suggested: NonNullable<Extraction['suggested']> = {
    expense: {
      note: ocr?.merchant ?? null,
      category_id: ocr ? await suggestCategory('expense', ocr.merchant, ocr.expense_category) : null,
      account_id: sendingAccount,
    },
    income: {
      note: ocr?.sender_name ?? null,
      category_id: ocr ? await suggestCategory('income', ocr.sender_name, ocr.income_category) : null,
      account_id: null,
    },
    transfer: { account_id: sendingAccount },
  };
  extraction.suggested = suggested;

  // Drafts from before slips asked for a direction already have a type; fill those in place.
  const forType: Suggestion | undefined = tx.type ? suggested[tx.type] : undefined;
  if (forType) {
    update.note = tx.note ?? forType.note ?? null;
    update.category_id = tx.category_id ?? forType.category_id ?? null;
    update.account_id = tx.account_id ?? forType.account_id ?? null;
  }

  if (ocr) {
    update.amount = tx.amount ?? ocr.amount;
    if (ocr.date) update.date = ocr.date;

    // Without a QR, the printed reference is the next best duplicate guard.
    const ref = ocr.reference_no?.replace(/\s+/g, '');
    if (!tx.bank_ref && ref) {
      const { data: dup } = await supabase
        .from('transactions')
        .select('id, date, amount')
        .eq('bank_ref', ref)
        .neq('id', id)
        .maybeSingle();
      if (dup) extraction.duplicateOf = dup;
      else update.bank_ref = ref;
    }
  }

  // Never overwrite an entry the user already confirmed while this was running.
  const { data: saved, error } = await supabase
    .from('transactions')
    .update(update)
    .eq('id', id)
    .neq('status', 'confirmed')
    .select('*')
    .maybeSingle<Transaction>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ transaction: saved ?? tx });
}
