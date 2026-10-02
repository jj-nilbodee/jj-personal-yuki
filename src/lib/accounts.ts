import type { AccountType } from './types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank account',
  card: 'Credit card',
  e_wallet: 'E-wallet',
  cash: 'Cash',
};

/** Display order and headings when accounts are grouped by type. */
export const ACCOUNT_GROUPS: { type: AccountType; label: string }[] = [
  { type: 'bank', label: 'Bank accounts' },
  { type: 'card', label: 'Credit cards' },
  { type: 'e_wallet', label: 'E-wallets' },
  { type: 'cash', label: 'Cash' },
];

export function groupAccounts<T extends { type: AccountType }>(accounts: T[]) {
  return ACCOUNT_GROUPS.map((g) => ({ ...g, accounts: accounts.filter((a) => a.type === g.type) })).filter(
    (g) => g.accounts.length > 0,
  );
}

/** "KBank → TrueMoney" for a transfer, using whatever account names are known. */
export function transferLabel(
  fromId: string | null,
  toId: string | null,
  accounts: Map<string, { name: string }>,
): string {
  const name = (id: string | null) => (id && accounts.get(id)?.name) || 'Account';
  return `${name(fromId)} → ${name(toId)}`;
}
