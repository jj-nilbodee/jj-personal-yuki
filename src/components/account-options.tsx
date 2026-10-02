import { groupAccounts } from '@/lib/accounts';
import type { Account } from '@/lib/types';

/** <option>s for an account <select>, grouped by type. Hidden accounts appear only if already chosen. */
export function AccountOptions({ accounts, selected }: { accounts: Account[]; selected?: string | null }) {
  const visible = accounts.filter((a) => !a.archived || a.id === selected);
  return groupAccounts(visible).map((g) => (
    <optgroup key={g.type} label={g.label}>
      {g.accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </optgroup>
  ));
}
