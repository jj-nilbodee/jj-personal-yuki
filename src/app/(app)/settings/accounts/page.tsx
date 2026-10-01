import { BackHeader } from '@/components/back-header';
import { THAI_BANKS } from '@/lib/slip/qr';
import { requireUser } from '@/lib/supabase/server';
import type { Account } from '@/lib/types';
import { AccountForm, ArchiveAccountButton, ACCOUNT_TYPE_LABELS } from './account-form';

export default async function AccountsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from('accounts').select('*').order('name');
  const accounts = (data ?? []) as Account[];

  return (
    <div className="grid gap-6">
      <BackHeader href="/settings" title="Accounts" />
      <ul className="card divide-y divide-border">
        {accounts.map((a) => (
          <li key={a.id} className={`flex items-center gap-3 px-4 py-2 ${a.archived ? 'text-ink-soft' : ''}`}>
            <details className="min-w-0 flex-1">
              <summary className="flex min-h-11 cursor-pointer flex-col justify-center">
                <span>
                  {a.name}
                  {a.archived && <span className="ml-2 text-xs">(hidden)</span>}
                </span>
                <span className="text-sm text-ink-soft">
                  {[ACCOUNT_TYPE_LABELS[a.type], a.bank_code && THAI_BANKS[a.bank_code]].filter(Boolean).join(' · ')}
                </span>
              </summary>
              <div className="pb-3">
                <AccountForm account={a} />
              </div>
            </details>
            <ArchiveAccountButton id={a.id} archived={a.archived} />
          </li>
        ))}
      </ul>
      <section className="grid gap-2">
        <h2 className="font-bold">Add an account</h2>
        <div className="card p-4">
          <AccountForm />
        </div>
      </section>
    </div>
  );
}
