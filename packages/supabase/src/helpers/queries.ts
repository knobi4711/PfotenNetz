import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { BookingType } from '../bookings/creation';

export type NearbyHelper =
  Database['public']['Functions']['find_nearby_helpers']['Returns'][number];

export interface NearbyHelperSearch {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number | undefined;
  bookingType?: BookingType | null | undefined;
  petSpecies?: string | null | undefined;
  dayOfWeek?: number | null | undefined;
}

export function nearbyHelperErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : String(error);
  if (message.includes('find_nearby_helpers') && message.includes('schema cache')) {
    return 'Die Helfersuche ist auf dem Server noch nicht aktiviert. Bitte die Remote-Migrationen 050 und 051 anwenden.';
  }
  return message;
}

export function validateNearbyHelperSearch(input: NearbyHelperSearch): string | null {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    return 'Ungültiger Breitengrad.';
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    return 'Ungültiger Längengrad.';
  }
  if (!Number.isFinite(input.radiusKm) || input.radiusKm < 0.5 || input.radiusKm > 50) {
    return 'Der Suchradius muss zwischen 0,5 und 50 km liegen.';
  }
  if (
    input.limit !== undefined &&
    (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 50)
  ) {
    return 'Das Ergebnislimit muss zwischen 1 und 50 liegen.';
  }
  if (
    input.dayOfWeek !== undefined &&
    input.dayOfWeek !== null &&
    (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6)
  )
    return 'Ungültiger Wochentag.';
  return null;
}

/** Calls the authenticated, privacy-preserving nearby-helper RPC. */
export async function fetchNearbyHelpers(
  client: SupabaseClient<Database>,
  input: NearbyHelperSearch
): Promise<NearbyHelper[]> {
  const validationError = validateNearbyHelperSearch(input);
  if (validationError !== null) throw new Error(validationError);

  const { data, error } = await client.rpc('find_nearby_helpers', {
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_radius_km: input.radiusKm,
    p_limit: input.limit ?? 20,
    ...(input.bookingType !== undefined ? { p_booking_type: input.bookingType } : {}),
    ...(input.petSpecies !== undefined ? { p_pet_species: input.petSpecies } : {}),
    ...(input.dayOfWeek !== undefined ? { p_day_of_week: input.dayOfWeek } : {}),
  });

  if (error) throw error;
  return data ?? [];
}

export interface HelperSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  booking_types: string[];
  max_distance_km: number;
  pet_species?: string[];
}

export interface HelperDetail {
  helper_id: string;
  display_name: string;
  avatar_url: string | null;
  trust_level: string;
  latitude: number;
  longitude: number;
  distance_km: number | null;
  rating: number;
  total_walks: number;
  available_days: number[];
  slots: HelperSlot[];
}

/** Privacy-preserving helper detail (rounded coords, rating, active slots). */
export async function fetchHelperDetail(
  client: SupabaseClient<Database>,
  helperId: string
): Promise<HelperDetail> {
  if (helperId.trim() === '') throw new Error('Helper-ID fehlt.');
  const { data, error } = await client.rpc('get_helper_detail', { p_helper_id: helperId }).single();
  if (error) throw error;
  if (data === null) throw new Error('Helper nicht gefunden.');
  return {
    ...data,
    slots: (Array.isArray(data.slots) ? data.slots : []) as unknown as HelperSlot[],
  };
}
