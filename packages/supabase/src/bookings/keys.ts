// Central TanStack Query keys for bookings.
// Used by hooks and by the invalidation strategy after mutations.

export const bookingKeys = {
  /** Prefix for all booking list queries (covers present and future lists). */
  all: ['bookings'] as const,
  /**
   * Prefix for single-booking queries, including grouped request details.
   * Detail keys live under their own root, so invalidating `all` alone does
   * not refresh an open detail screen.
   */
  details: ['booking'] as const,
  /** The caller's bookings (RLS scopes to participations), newest first. */
  list: (scope: 'active' | 'archive' = 'active') =>
    scope === 'active' ? (['bookings', 'list'] as const) : (['bookings', 'list', scope] as const),
  /** Single booking detail, including relations. */
  detail: (bookingId: string) => ['booking', bookingId] as const,
} as const;
