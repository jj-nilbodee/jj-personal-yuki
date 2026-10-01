import { notFound } from 'next/navigation';
import { BackHeader } from '@/components/back-header';
import { requireUser } from '@/lib/supabase/server';
import type { Account, Category, RecurringRule } from '@/lib/types';
import { RuleForm } from '../rule-form';

// Serves both /settings/recurring/new and /settings/recurring/<id>.
export default async function RecurringRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: rule }, { data: categories }, { data: accounts }] = await Promise.all([
    id === 'new' ? Promise.resolve({ data: null }) : supabase.from('recurring_rules').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name'),
  ]);
  if (id !== 'new' && !rule) notFound();

  return (
    <div className="grid gap-5">
      <BackHeader href="/settings/recurring" title={rule ? 'Edit recurring' : 'New recurring'} />
      <RuleForm rule={(rule as RecurringRule) ?? undefined} categories={(categories ?? []) as Category[]} accounts={(accounts ?? []) as Account[]} />
    </div>
  );
}
