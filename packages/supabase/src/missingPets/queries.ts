import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type MissingPet = Database['public']['Tables']['missing_pets']['Row'];
export type MissingPetSighting = Database['public']['Tables']['missing_pet_sightings']['Row'];
export type MissingPetSightingWithPhotoUrls = MissingPetSighting & { photoUrls: string[] };

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

export async function fetchNearbyMissingPets(
  client: SupabaseClient<Database>
): Promise<MissingPet[]> {
  await requireUserId(client);
  const { data, error } = await client
    .from('missing_pets')
    .select('*')
    .eq('status', 'active')
    .order('last_seen_at', { ascending: false })
    .limit(50);
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

export async function fetchMissingPetSightings(
  client: SupabaseClient<Database>,
  missingPetId: string
): Promise<MissingPetSightingWithPhotoUrls[]> {
  const { data, error } = await client
    .from('missing_pet_sightings')
    .select('*')
    .eq('missing_pet_id', missingPetId)
    .order('seen_at', { ascending: false });
  if (error) throw error;
  const sightings = data ?? [];
  return Promise.all(
    sightings.map(async (sighting) => {
      const photoUrls = (
        await Promise.all(
          sighting.photos.map(async (path) => {
            const result = await client.storage
              .from('missing-pet-photos')
              .createSignedUrl(path, 60 * 60);
            return result.data?.signedUrl ?? null;
          })
        )
      ).filter((url): url is string => url !== null);
      return { ...sighting, photoUrls };
    })
  );
}

export async function createMissingPetSighting(
  client: SupabaseClient<Database>,
  input: {
    missingPetId: string;
    latitude: number;
    longitude: number;
    description: string;
    seenAt: string;
  }
): Promise<MissingPetSighting> {
  const reporterId = await requireUserId(client);
  const { data, error } = await client
    .from('missing_pet_sightings')
    .insert({
      missing_pet_id: input.missingPetId,
      reporter_id: reporterId,
      location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
      description: input.description.trim() || null,
      seen_at: input.seenAt,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadMissingPetSightingPhoto(
  client: SupabaseClient<Database>,
  sightingId: string,
  fileData: ArrayBuffer,
  contentType = 'image/jpeg'
): Promise<MissingPetSighting> {
  await requireUserId(client);
  const path = `${sightingId}/sighting-${Date.now()}.jpg`;
  const upload = await client.storage.from('missing-pet-photos').upload(path, fileData, {
    contentType,
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const { data: current, error: readError } = await client
    .from('missing_pet_sightings')
    .select('photos')
    .eq('id', sightingId)
    .single();
  if (readError) throw readError;
  const { data, error } = await client
    .from('missing_pet_sightings')
    .update({ photos: [...current.photos, path] })
    .eq('id', sightingId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
