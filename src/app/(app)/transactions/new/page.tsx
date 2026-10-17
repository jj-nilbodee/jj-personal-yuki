import { BackHeader } from '@/components/back-header';
import { TransactionEditor } from '@/components/transaction-editor';
import { parseRepeat } from '@/lib/recurring';
import { requireUser } from '@/lib/supabase/server';
import type { Account, Category, TxnType } from '@/lib/types';

const NEW_TYPES: TxnType[] = ['expense', 'income', 'transfer'];

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string; repeat?: string }> }) {
  const { supabase } = await requireUser();
  const query = await searchParams;
  const newType = NEW_TYPES.find((t) => t === query.type);
  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('categories').select('*').eq('archived', false).order('name'),
    supabase.from('accounts').select('*').eq('archived', false).order('name'),
  ]);

  return (
    <div className="grid gap-4">
      <BackHeader href="/" title="New entry" />
      <TransactionEditor
        newType={newType}
        newRepeat={parseRepeat(query.repeat ?? null) ?? undefined}
        categories={(categories ?? []) as Category[]}
        accounts={(accounts ?? []) as Account[]}
      />
    </div>
  );
}
