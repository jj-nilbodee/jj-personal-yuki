import { notFound } from 'next/navigation';
import { BackHeader } from '@/components/back-header';
import { RuleForm } from '@/components/rule-form';
import { requireUser } from '@/lib/supabase/server';
import type { Account, Category, RecurringRule } from '@/lib/types';

export default async function RecurringRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: rule }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('recurring_rules').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name'),
  ]);
  if (!rule) notFound();

  return (
    <div className="grid gap-5">
      <BackHeader href="/transactions/recurring" title="Edit recurring" />
      <RuleForm rule={rule as RecurringRule} categories={(categories ?? []) as Category[]} accounts={(accounts ?? []) as Account[]} />
    </div>
  );
}
