import { notFound } from 'next/navigation';
import { BackHeader } from '@/components/back-header';
import { TransactionEditor } from '@/components/transaction-editor';
import { requireUser } from '@/lib/supabase/server';
import type { Account, Category, Transaction } from '@/lib/types';

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [{ data: tx }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', id).maybeSingle<Transaction>(),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name'),
  ]);
  if (!tx) notFound();

  const slipUrl = tx.slip_path
    ? (await supabase.storage.from('slips').createSignedUrl(tx.slip_path, 60 * 30)).data?.signedUrl
    : null;

  return (
    <div className="grid gap-4">
      <BackHeader href="/transactions" title={tx.status === 'confirmed' ? 'Edit entry' : 'Check this one'} />
      <TransactionEditor
        tx={tx}
        categories={(categories ?? []) as Category[]}
        accounts={(accounts ?? []) as Account[]}
        slipUrl={slipUrl}
      />
    </div>
  );
}
