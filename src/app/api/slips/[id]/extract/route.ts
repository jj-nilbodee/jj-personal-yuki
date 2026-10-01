import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractSlipFields } from '@/lib/slip/extract';
import type { Category, Extraction, SlipFields, Transaction } from '@/lib/types';

const MIN_CONFIDENCE = 0.5;

// Step 2 of the slip flow: read the stored photo with Gemini and fill in what
// the QR code doesn't carry (amount, date, merchant). Safe to call again to retry.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

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
    ocr = await extractSlipFields(
      { data: Buffer.from(await file.arrayBuffer()), mimeType: file.type || 'image/webp' },
      (categories ?? []).filter((c) => c.type === 'expense').map((c) => c.name),
    );
    if (!ocr) extraction.error = 'unavailable';
    else if (ocr.amount === null || ocr.confidence < MIN_CONFIDENCE) extraction.error = 'unreadable';
  } catch (err) {
    console.error('slip extraction failed', id, err);
    extraction.error = 'unreadable';
  }
  extraction.ocr = ocr;

  const update: Partial<Transaction> = { status: 'needs_review', extraction };
  // The QR names the sending bank; if exactly one account is at that bank, it's this one.
  if (bankAccounts?.length === 1) update.account_id = bankAccounts[0].id;
  if (ocr) {
    update.amount = tx.amount ?? ocr.amount;
    update.merchant = tx.merchant ?? ocr.merchant;
    if (ocr.date) update.date = ocr.date;

    // Prefer the category this merchant got last time; fall back to the model's pick.
    if (!tx.category_id) {
      const fromHistory = ocr.merchant
        ? (await supabase.rpc('suggest_category', { p_merchant: ocr.merchant })).data
        : null;
      const byName = categories?.find((c) => c.type === 'expense' && c.name === ocr!.category)?.id;
      update.category_id = fromHistory ?? byName ?? null;
    }

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
