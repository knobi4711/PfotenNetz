export const APP_NAME = 'PfotenNetz';
export const APP_DESCRIPTION = 'Nachbarschafts-Plattform für Haustierbetreuung';
export const APP_VERSION = '0.0.1';

/**
 * Tasso-Zentralregister: einheitliche Notrufnummer für alle registrierten
 * Tiere. Die Nummer gehört nicht zum einzelnen Tierprofil, sondern wird
 * überall gleich angezeigt und verlinkt.
 */
export const TASSO_PHONE_NUMBER = '+49 6190 937300';
export const TASSO_PHONE_URL = 'tel:+496190937300';

export const STORAGE_KEYS = {
  AUTH: 'pfotennetz-auth',
  THEME: 'pfotennetz-theme',
  ONBOARDING: 'pfotennetz-onboarding',
  LOCATION_PERMISSION: 'pfotennetz-location-permission',
} as const;

export const API_TIMEOUT = 30000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const TRUST_LEVELS = ['basic', 'bronze', 'silver', 'gold'] as const;
export const USER_ROLES = ['user', 'helper', 'admin'] as const;

export const BOOKING_TYPES = ['walk', 'feeding', 'vacation', 'daycare', 'ride'] as const;
export const BOOKING_TYPE_LABELS: Record<(typeof BOOKING_TYPES)[number], string> = {
  walk: 'Gassirunde',
  feeding: 'Fütterung',
  vacation: 'Urlaubsbetreuung',
  daycare: 'Tagesbetreuung',
  ride: 'Ausreiten',
};

export function bookingTypeLabel(type: (typeof BOOKING_TYPES)[number]): string {
  return BOOKING_TYPE_LABELS[type];
}

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
