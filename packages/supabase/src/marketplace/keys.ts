export const marketplaceKeys = {
  all: ['marketplace'] as const,
  listings: (filters: { kind?: string; category?: string; search?: string }) =>
    ['marketplace', 'listings', filters] as const,
  own: ['marketplace', 'own'] as const,
};
