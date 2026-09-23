// Central TanStack Query keys for the caller's own pets (RLS).

export const petsKeys = {
  /** Prefix for all pet queries. */
  all: ['pets'] as const,
  /** The caller's own pets, newest first. */
  own: ['pets', 'own'] as const,
} as const;
