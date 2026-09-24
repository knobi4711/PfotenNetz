export const trackingKeys = {
  all: ['tracking'] as const,
  active: ['tracking', 'active'] as const,
  points: (sessionId: string) => ['tracking', 'points', sessionId] as const,
} as const;
