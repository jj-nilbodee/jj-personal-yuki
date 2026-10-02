-- Moving money between your own accounts (bank -> e-wallet top-up, paying the
-- credit card bill) is neither spending nor income. Kept in its own migration
-- because a new enum value can't be used in the transaction that adds it.
alter type public.txn_type add value if not exists 'transfer';
