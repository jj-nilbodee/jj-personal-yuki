import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseSlipQr } from '@/lib/slip/qr';
import { todayISO } from '@/lib/format';

// Step 1 of the slip flow: store the photo and create a "processing" row right
// away, so it shows up in the list before extraction finishes (optimistic UI).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await request.formData();
  const image = form.get('image');
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: 'missing_image' }, { status: 400 });
  }
  const qr = typeof form.get('qr') === 'string' ? parseSlipQr(form.get('qr') as string) : null;

  if (qr) {
    const { data: existing } = await supabase
      .from('transactions')
      .select('id, date, amount')
      .eq('bank_ref', qr.ref)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'duplicate', existing }, { status: 409 });
  }

  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      status: 'processing',
      source: qr ? 'qr' : 'ocr',
      bank_ref: qr?.ref ?? null,
      sending_bank_code: qr?.bankCode ?? null,
      extraction: { qr },
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ext = image.type === 'image/webp' ? 'webp' : image.type === 'image/png' ? 'png' : 'jpg';
  const path = `${auth.user.id}/${todayISO().slice(0, 4)}/${tx.id}.${ext}`;
  const upload = await supabase.storage.from('slips').upload(path, image, { contentType: image.type });
  if (upload.error) {
    await supabase.from('transactions').delete().eq('id', tx.id);
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }
  await supabase.from('transactions').update({ slip_path: path }).eq('id', tx.id);

  return NextResponse.json({ id: tx.id }, { status: 201 });
}
