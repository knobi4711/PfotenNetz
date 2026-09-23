// Central TanStack Query keys for bookings.
// Used by hooks and by the invalidation strategy after mutations.

export const bookingKeys = {
  /** Prefix for all booking queries (covers present and future booking lists). */
  all: ['bookings'] as const,
  /** The caller's bookings (RLS scopes to participations), newest first. */
  list: () => ['bookings', 'list'] as const,
  /** Single booking detail, including relations. */
  detail: (bookingId: string) => ['booking', bookingId] as const,
} as const;
