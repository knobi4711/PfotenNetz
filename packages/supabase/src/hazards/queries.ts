import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Hazard = Database['public']['Tables']['hazards']['Row'];
export type HazardType = Database['public']['Enums']['hazard_type'];
export type HazardSeverity = Database['public']['Enums']['hazard_severity'];
export type ActiveHazard =
  Database['public']['Functions']['get_active_hazards_in_radius']['Returns'][number];
export type HazardSighting = Database['public']['Tables']['hazard_sightings']['Row'];

export const HAZARD_TYPE_LABELS: Record<HazardType, string> = {
  poison_bait: 'Giftköderverdacht',
  glass_shards: 'Glasscherben / Müll',
  wasp_nest: 'Wespen- oder Eichenprozessionsspinner',
  aggressive_dog: 'Aggressiver Hund',
  trap: 'Falle oder gefährlicher Gegenstand',
  other: 'Sonstige Gefahr',
};

export const HAZARD_SEVERITY_LABELS: Record<HazardSeverity, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  critical: 'Akute Lebensgefahr',
};

export const HAZARD_STATUS_LABELS: Record<Database['public']['Enums']['hazard_status'], string> = {
  draft: 'Entwurf',
  pending_review: 'Wird geprüft',
  active: 'Aktiv',
  resolved: 'Entwarnt',
  expired: 'Abgelaufen',
  rejected: 'Abgelehnt',
};

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user === null) throw new Error('Not authenticated');
  return data.user.id;
}

export async function fetchActiveHazards(
  client: SupabaseClient<Database>,
  input: { latitude: number; longitude: number; radiusKm: number }
): Promise<ActiveHazard[]> {
  const { data, error } = await client.rpc('get_active_hazards_in_radius', {
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_radius_km: input.radiusKm,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchHazard(
  client: SupabaseClient<Database>,
  hazardId: string
): Promise<Hazard> {
  const { data, error } = await client.from('hazards').select('*').eq('id', hazardId).single();
  if (error) throw error;
  return data;
}

export async function fetchOwnHazards(client: SupabaseClient<Database>): Promise<Hazard[]> {
  const reporterId = await requireUserId(client);
  const { data, error } = await client
    .from('hazards')
    .select('*')
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false })
    .limit(25);
  if (error) throw error;
  return data ?? [];
}

export function subscribeHazards(
  client: SupabaseClient<Database>,
  onEvent: () => void
): () => void {
  const channel: RealtimeChannel = client
    .channel('hazards:nearby')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hazards' }, onEvent)
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function createHazard(
  client: SupabaseClient<Database>,
  input: {
    type: HazardType;
    severity: HazardSeverity;
    latitude: number;
    longitude: number;
    radiusKm: number;
    address: string | null;
    description: string;
  }
): Promise<Hazard> {
  const reporterId = await requireUserId(client);
  const { data, error } = await client
    .from('hazards')
    .insert({
      hazard_number: `PN-${Date.now().toString(36).toUpperCase()}`,
      reporter_id: reporterId,
      type: input.type,
      severity: input.severity,
      status: 'pending_review',
      location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
      radius_km: input.radiusKm,
      address: input.address,
      description: input.description.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadHazardPhoto(
  client: SupabaseClient<Database>,
  hazardId: string,
  fileData: ArrayBuffer,
  contentType = 'image/jpeg'
): Promise<Hazard> {
  await requireUserId(client);
  const path = `${hazardId}/report-${Date.now()}.jpg`;
  const upload = await client.storage.from('hazard-photos').upload(path, fileData, {
    contentType,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const { data: current, error: readError } = await client
    .from('hazards')
    .select('photos')
    .eq('id', hazardId)
    .single();
  if (readError) throw readError;
  const { data, error } = await client
    .from('hazards')
    .update({ photos: [...current.photos, path] })
    .eq('id', hazardId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createHazardSighting(
  client: SupabaseClient<Database>,
  input: { hazardId: string; latitude: number; longitude: number; description: string }
): Promise<HazardSighting> {
  const reporterId = await requireUserId(client);
  const { data, error } = await client
    .from('hazard_sightings')
    .insert({
      hazard_id: input.hazardId,
      reporter_id: reporterId,
      location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
      description: input.description.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createHazardPhotoUrl(
  client: SupabaseClient<Database>,
  path: string
): Promise<string | null> {
  const { data, error } = await client.storage.from('hazard-photos').createSignedUrl(path, 3600);
  return error === null ? data.signedUrl : null;
}
