export const APP_NAME = 'PfotenNetz';
export const APP_DESCRIPTION = 'Nachbarschafts-Plattform für Haustierbetreuung';
export const APP_VERSION = '0.0.1';

export const STORAGE_KEYS = {
  AUTH: 'pfotennetz-auth',
  THEME: 'pfotennetz-theme',
  ONBOARDING: 'pfotennetz-onboarding',
  LOCATION_PERMISSION: 'pfotennetz-location-permission',
} as const;

export const API_TIMEOUT = 30000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const KIEZ_RADIUS_OPTIONS = [0.5, 1.0, 1.5, 3.0] as const;
export const DEFAULT_KIEZ_RADIUS = 1.5;

export const TRUST_LEVELS = ['basic', 'bronze', 'silver', 'gold'] as const;
export const USER_ROLES = ['user', 'helper', 'admin'] as const;

export const BOOKING_TYPES = ['walk', 'feeding', 'vacation', 'daycare'] as const;
export const BOOKING_STATUSES = [
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
] as const;

export const HAZARD_TYPES = [
  'poison_bait',
  'glass_shards',
  'wasp_nest',
  'aggressive_dog',
  'trap',
  'other',
] as const;
export const HAZARD_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const HAZARD_STATUSES = [
  'draft',
  'pending_review',
  'active',
  'resolved',
  'expired',
  'rejected',
] as const;
