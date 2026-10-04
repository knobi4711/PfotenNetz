export const verificationKeys = {
  all: ['verifications'] as const,
  own: ['verifications', 'own'] as const,
  admin: ['verifications', 'admin'] as const,
} as const;
