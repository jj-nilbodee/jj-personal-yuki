import { BackHeader } from '@/components/back-header';
import { TransactionEditor } from '@/components/transaction-editor';
import { requireUser } from '@/lib/supabase/server';
import type { Account, Category } from '@/lib/types';

export default async function NewTransactionPage() {
  const { supabase } = await requireUser();
  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('categories').select('*').eq('archived', false).order('name'),
    supabase.from('accounts').select('*').eq('archived', false).order('name'),
  ]);

  return (
    <div className="grid gap-4">
      <BackHeader href="/" title="New entry" />
      <TransactionEditor categories={(categories ?? []) as Category[]} accounts={(accounts ?? []) as Account[]} />
    </div>
  );
}
