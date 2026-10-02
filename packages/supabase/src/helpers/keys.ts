export const helperKeys = {
  all: ['helpers'] as const,
  nearby: (search: object) => ['helpers', 'nearby', search] as const,
  detail: (helperId: string) => ['helpers', 'detail', helperId] as const,
} as const;
