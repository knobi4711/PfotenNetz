// Central TanStack Query keys for the timebank ledger.
// Only the caller's own account/transactions are ever queried (RLS).

export const timebankKeys = {
  /** Prefix for all timebank queries. */
  all: ['timebank'] as const,
  /** The caller's own timebank account (may not exist yet). */
  account: ['timebank', 'account'] as const,
  /** The caller's own transactions, newest first. */
  transactions: ['timebank', 'transactions'] as const,
} as const;
