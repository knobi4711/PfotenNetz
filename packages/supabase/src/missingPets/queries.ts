import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type MissingPet = Database['public']['Tables']['missing_pets']['Row'];

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function fetchOwnMissingPets(client: SupabaseClient<Database>): Promise<MissingPet[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('missing_pets')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMissingPet(
  client: SupabaseClient<Database>,
  input: {
    petId: string;
    latitude: number;
    longitude: number;
    description: string;
    lastSeenAt: string;
    radiusKm: number;
  }
): Promise<MissingPet> {
  const reporterId = await requireUserId(client);
  const { data, error } = await client
    .from('missing_pets')
    .insert({
      pet_id: input.petId,
      reporter_id: reporterId,
      last_seen_location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
      last_seen_at: input.lastSeenAt,
      search_radius_km: input.radiusKm,
      description: input.description.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function markMissingPetFound(
  client: SupabaseClient<Database>,
  missingPetId: string
): Promise<MissingPet> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('missing_pets')
    .update({ status: 'found', found_at: new Date().toISOString(), found_by: userId })
    .eq('id', missingPetId)
    .eq('reporter_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
