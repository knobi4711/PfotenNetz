// Central TanStack Query keys for the caller's own profile (RLS).

export const profileKeys = {
  /** Prefix for all profile queries. */
  all: ['profile'] as const,
  /** The caller's own profile row. */
  own: ['profile', 'own'] as const,
} as const;
