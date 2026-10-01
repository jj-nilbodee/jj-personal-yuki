import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Vercel Cron (vercel.json) calls this daily at 00:00 Bangkok time.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await createServiceClient().rpc('run_due_recurring');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: data });
}
