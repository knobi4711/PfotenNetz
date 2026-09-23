import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Booking = Database['public']['Tables']['bookings']['Row'];

export interface BookingPet {
  id: string;
  name: string;
  species: string;
}

export interface BookingProfile {
  id: string;
  display_name: string;
}

export interface BookingWithRelations extends Booking {
  pet: BookingPet | null;
  seekerProfile: BookingProfile | null;
  helperProfile: BookingProfile | null;
}

// Narrow embed: only the fields the UI needs. Related rows that RLS hides
// from the caller arrive as null instead of failing the whole query.
export const BOOKING_SELECT = [
  '*',
  'pet:pets!bookings_pet_id_fkey(id,name,species)',
  'seekerProfile:profiles!bookings_seeker_id_fkey(id,display_name)',
  'helperProfile:profiles!bookings_helper_id_fkey(id,display_name)',
].join(',');

/**
 * Loads a single booking with pet and participant display info.
 * Runs on the authenticated client, so RLS applies. Throws on error.
 */
export async function fetchBooking(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<BookingWithRelations> {
  const { data, error } = await client
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', bookingId)
    .single();

  if (error) throw error;
  if (data === null) throw new Error(`Booking not found: ${bookingId}`);
  return data as unknown as BookingWithRelations;
}

/**
 * Loads the caller's bookings, newest first.
 * No explicit user filter: the "Participants read booking" RLS policy
 * already scopes rows to bookings where the caller is seeker or helper.
 * Throws on error.
 */
export async function fetchBookingsForUser(
  client: SupabaseClient<Database>
): Promise<BookingWithRelations[]> {
  const { data, error } = await client
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('start_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as BookingWithRelations[];
}
