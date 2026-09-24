import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type NotificationPreferences = {
  hazards: boolean;
  bookings: boolean;
  community: boolean;
};

export const KIEZ_RADIUS_OPTIONS = [0.5, 1.0, 1.5, 3.0] as const;
export type KiezRadius = (typeof KIEZ_RADIUS_OPTIONS)[number];

export interface UpdateOwnProfileInput {
  displayName: string;
  phone: string | null;
  kiezRadiusKm: KiezRadius;
  notificationPrefs?: NotificationPreferences;
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

export function validateUpdateOwnProfile(input: UpdateOwnProfileInput): string | null {
  if (input.displayName.trim().length < 2) {
    return 'Bitte gib einen Namen mit mindestens zwei Zeichen ein.';
  }
  if (input.phone !== null && input.phone !== '' && input.phone.trim().length < 3) {
    return 'Bitte gib eine gültige Telefonnummer ein oder lasse das Feld leer.';
  }
  return null;
}

/** Loads the caller's own profile (created at signup by the auth trigger). */
export async function fetchOwnProfile(client: SupabaseClient<Database>): Promise<Profile | null> {
  const userId = await requireUserId(client);
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Updates the caller's own editable profile fields.
 * Only display_name, phone and kiez_radius_km are writable from the app;
 * role, trust_level, email and all server-managed fields stay untouched.
 */
export async function updateOwnProfile(
  client: SupabaseClient<Database>,
  input: UpdateOwnProfileInput
): Promise<Profile> {
  const validationError = validateUpdateOwnProfile(input);
  if (validationError !== null) throw new Error(validationError);

  const userId = await requireUserId(client);
  const phone = input.phone === null || input.phone.trim() === '' ? null : input.phone.trim();
  const { data, error } = await client
    .from('profiles')
    .update({
      display_name: input.displayName.trim(),
      phone,
      kiez_radius_km: input.kiezRadiusKm,
      ...(input.notificationPrefs ? { notification_prefs: input.notificationPrefs } : {}),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
