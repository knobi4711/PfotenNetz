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
  postalCode: string;
  profileBio?: string | null;
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
  if (!/^\d{5}$/.test(input.postalCode?.trim() ?? '')) {
    return 'Bitte gib eine gültige fünfstellige Postleitzahl ein.';
  }
  if (input.phone !== null && input.phone !== '' && input.phone.trim().length < 3) {
    return 'Bitte gib eine gültige Telefonnummer ein oder lasse das Feld leer.';
  }
  if (input.profileBio !== undefined && input.profileBio !== null && input.profileBio.length > 500)
    return 'Die Kurzvorstellung darf höchstens 500 Zeichen enthalten.';
  return null;
}

/** Loads the caller's own profile (created at signup by the auth trigger). */
export async function fetchOwnProfile(client: SupabaseClient<Database>): Promise<Profile | null> {
  const userId = await requireUserId(client);
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) throw error;
  return data;
}

/** Permanently deletes the authenticated user's account through a server-side RPC. */
export async function deleteOwnAccount(client: SupabaseClient<Database>): Promise<void> {
  const { error } = await client.rpc('delete_own_account');
  if (error) throw error;
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
      postal_code: input.postalCode.trim(),
      ...(input.profileBio !== undefined ? { profile_bio: input.profileBio?.trim() || null } : {}),
      kiez_radius_km: input.kiezRadiusKm,
      ...(input.notificationPrefs ? { notification_prefs: input.notificationPrefs } : {}),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function uploadOwnAvatar(
  client: SupabaseClient<Database>,
  fileData: ArrayBuffer,
  contentType = 'image/jpeg'
): Promise<Profile> {
  const userId = await requireUserId(client);
  const path = `${userId}/avatar.jpg`;
  const upload = await client.storage
    .from('avatars')
    .upload(path, fileData, { contentType, upsert: true });
  if (upload.error) throw upload.error;
  const { data, error } = await client
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
