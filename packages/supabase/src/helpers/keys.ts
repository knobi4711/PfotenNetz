export const helperKeys = {
  all: ['helpers'] as const,
  nearby: (latitude: number, longitude: number, radiusKm: number) =>
    ['helpers', 'nearby', latitude, longitude, radiusKm] as const,
  detail: (helperId: string) => ['helpers', 'detail', helperId] as const,
} as const;
