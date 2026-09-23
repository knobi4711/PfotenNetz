export const routes = {
  // Mobile (Expo Router) & Web (Next.js) shared route definitions
  home: '/(tabs)/home' as const,
  explore: '/(tabs)/explore' as const,
  tracking: '/(tabs)/tracking' as const,
  profile: '/(tabs)/profile' as const,

  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    onboarding: '/auth/onboarding',
    passkey: '/auth/passkey',
  },

  // Home stack
  petDetail: (petId: string) => `/pet/${petId}`,
  bookingNew: '/booking/new',

  // Explore stack
  helperDetail: (helperId: string) => `/helper/${helperId}`,

  // Tracking stack
  liveTracking: (bookingId: string) => `/tracking/live/${bookingId}`,
  chat: (bookingId: string) => `/chat/${bookingId}`,

  // Profile stack
  trust: '/profile/trust',
  community: '/profile/community',
  missing: '/profile/missing',
  settings: '/profile/settings',

  // Hazard stack
  hazardReportStep1: '/hazard/report/step-1',
  hazardReportStep2: '/hazard/report/step-2',
  hazardReportStep3: '/hazard/report/step-3',
  hazardSuccess: '/hazard/report/success',
  hazardDetail: (hazardId: string) => `/hazard/${hazardId}`,
  hazardRadar: '/hazard/radar',

  // Architecture (Desktop only)
  architecture: '/architecture/overview',
} as const;

export const deepLinkPrefix = 'pfotennetz://';

export const deepLinkRoutes = {
  hazardDetail: (id: string) => `${deepLinkPrefix}hazard/${id}`,
  bookingTracking: (id: string) => `${deepLinkPrefix}tracking/live/${id}`,
  helperProfile: (id: string) => `${deepLinkPrefix}helper/${id}`,
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];
