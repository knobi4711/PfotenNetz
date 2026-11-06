// Query keys for public platform metrics.
// These values are aggregated counts only and contain no profile data.

export const statsKeys = {
  /** Prefix for all public metric queries. */
  all: ['stats'] as const,
  /** Number of registered profiles. */
  registeredUsers: ['stats', 'registered-users'] as const,
  /** Number of verified helpers around the caller's stored location. */
  nearbyHelpers: ['stats', 'nearby-helpers'] as const,
} as const;
