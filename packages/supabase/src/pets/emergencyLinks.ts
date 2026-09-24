import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type PublicEmergencyCard =
  Database['public']['Functions']['get_public_emergency_card']['Returns'][number];
export type EmergencyCardLink = Database['public']['Tables']['emergency_card_links']['Row'];

export async function fetchOwnEmergencyCardLinks(
  client: SupabaseClient<Database>
): Promise<EmergencyCardLink[]> {
  const { data, error } = await client
    .from('emergency_card_links')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createEmergencyCardLink(
  client: SupabaseClient<Database>,
  petId: string,
  token: string
): Promise<{ id: string; expires_at: string }> {
  const { data, error } = await client.rpc('create_emergency_card_link', {
    p_pet_id: petId,
    p_token: token,
  });
  if (error) throw error;
  const link = data?.[0];
  if (!link) throw new Error('Notfallkarten-Link konnte nicht erstellt werden.');
  return link;
}

export async function fetchPublicEmergencyCard(
  client: SupabaseClient<Database>,
  token: string
): Promise<PublicEmergencyCard | null> {
  const { data, error } = await client.rpc('get_public_emergency_card', { p_token: token });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function revokeEmergencyCardLink(
  client: SupabaseClient<Database>,
  linkId: string
): Promise<void> {
  const { error } = await client.rpc('revoke_emergency_card_link', { p_id: linkId });
  if (error) throw error;
}
