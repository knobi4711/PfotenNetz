export const hazardKeys = {
  all: ['hazards'] as const,
  own: ['hazards', 'own'] as const,
  active: (latitude: number, longitude: number, radiusKm: number) =>
    ['hazards', 'active', latitude, longitude, radiusKm] as const,
  detail: (hazardId: string) => ['hazards', 'detail', hazardId] as const,
};
