// Central TanStack Query keys for reusable booking templates (RLS: owner only).

export const bookingTemplateKeys = {
  /** Prefix for all booking template queries. */
  all: ['booking-templates'] as const,
  /** The caller's own templates, most recently used first. */
  own: ['booking-templates', 'own'] as const,
} as const;
