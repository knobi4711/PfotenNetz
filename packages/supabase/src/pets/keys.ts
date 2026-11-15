// Central TanStack Query keys for the caller's own pets (RLS).

export const petsKeys = {
  /** Prefix for all pet queries. */
  all: ['pets'] as const,
  /** The caller's own pets, newest first. */
  own: ['pets', 'own'] as const,
  /** Pets by id, e.g. the animals of a booking (RLS scoped). */
  byIds: (petIds: readonly string[]) => ['pets', 'by-ids', [...petIds].sort()] as const,
  emergencyLinks: ['pets', 'emergency-links'] as const,
} as const;
