export const messageKeys = {
  all: ['messages'] as const,
  booking: (bookingId: string) => ['messages', 'booking', bookingId] as const,
} as const;
