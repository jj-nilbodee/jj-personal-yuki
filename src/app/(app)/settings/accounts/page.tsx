import { BackHeader } from '@/components/back-header';
import { groupAccounts } from '@/lib/accounts';
import { formatBalance } from '@/lib/format';
import { THAI_BANKS } from '@/lib/slip/qr';
import { requireUser } from '@/lib/supabase/server';
import type { AccountBalance } from '@/lib/types';
import { AccountForm, ArchiveAccountButton } from './account-form';

export default async function AccountsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc('account_balances');
  const accounts = (data ?? []) as AccountBalance[];

  return (
    <div className="grid gap-6">
      <BackHeader href="/settings" title="Accounts" />
      {groupAccounts(accounts).map((g) => (
        <section key={g.type} className="grid gap-2">
          <h2 className="font-bold">{g.label}</h2>
          <ul className="card divide-y divide-border">
            {g.accounts.map((a) => (
              <li key={a.id} className={`flex items-center gap-3 px-4 py-2 ${a.archived ? 'text-ink-soft' : ''}`}>
                <details className="min-w-0 flex-1">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {a.name}
                        {a.archived && <span className="ml-2 text-xs">(hidden)</span>}
                      </span>
                      {a.bank_code && <span className="block text-sm text-ink-soft">{THAI_BANKS[a.bank_code]}</span>}
                    </span>
                    <span className="num text-sm">{formatBalance(Number(a.balance), a.type)}</span>
                  </summary>
                  <div className="pb-3">
                    <AccountForm account={{ ...a, balance: Number(a.balance) }} />
                  </div>
                </details>
                <ArchiveAccountButton id={a.id} archived={a.archived} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="grid gap-2">
        <h2 className="font-bold">Add an account</h2>
        <div className="card p-4">
          <AccountForm />
        </div>
      </section>
    </div>
  );
}
