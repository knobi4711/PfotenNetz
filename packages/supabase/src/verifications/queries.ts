import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Verification = Database['public']['Tables']['verifications']['Row'];
export type VerificationType = Database['public']['Enums']['verification_type'];

export const HELPER_VERIFICATION_TYPES: VerificationType[] = ['id_document', 'liability_insurance'];

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

/** Own verification requests, newest first. */
export async function fetchOwnVerifications(
  client: SupabaseClient<Database>
): Promise<Verification[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('verifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Requests helper status by opening the required verification checks.
 * role/trust_level stay server-managed (admin approval upgrades them);
 * this only creates pending verification rows, idempotent per type.
 */
export async function requestHelperStatus(
  client: SupabaseClient<Database>
): Promise<Verification[]> {
  const userId = await requireUserId(client);
  const existing = await fetchOwnVerifications(client);
  const pendingTypes = new Set(
    existing.filter((v) => v.status === 'pending' || v.status === 'approved').map((v) => v.type)
  );
  const toCreate = HELPER_VERIFICATION_TYPES.filter((t) => !pendingTypes.has(t));
  if (toCreate.length === 0) return existing;
  const { data, error } = await client
    .from('verifications')
    .insert(toCreate.map((type) => ({ user_id: userId, type })))
    .select('*');
  if (error) throw error;
  return [...(data ?? []), ...existing];
}

/** Securely stores the caller's location (validated server-side). */
export async function updateOwnLocation(
  client: SupabaseClient<Database>,
  input: { latitude: number; longitude: number }
): Promise<void> {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error('Ungültiger Breitengrad.');
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error('Ungültiger Längengrad.');
  }
  const { error } = await client.rpc('update_own_location', {
    p_latitude: input.latitude,
    p_longitude: input.longitude,
  });
  if (error) throw error;
}
