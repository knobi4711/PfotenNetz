import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Booking = Database['public']['Tables']['bookings']['Row'];

export type BookingListScope = 'active' | 'archive' | 'all';
export const BOOKING_ARCHIVE_AFTER_DAYS = 3;
const BOOKING_ARCHIVE_AFTER_MS = BOOKING_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;

function closedAtForBooking(booking: Booking): string | null {
  if (booking.status === 'cancelled') {
    return booking.closed_at ?? booking.cancelled_at ?? booking.updated_at;
  }
  if (booking.status === 'completed') {
    // updated_at is a compatibility fallback for rows created before 075.
    return booking.closed_at ?? booking.updated_at;
  }
  return null;
}

export function isBookingArchived(booking: Booking, now = Date.now()): boolean {
  // A request is no longer active once its care period has ended. This must
  // not depend on whether a helper was assigned or on the terminal status.
  if (new Date(booking.end_at).getTime() <= now) return true;

  const closedAt = closedAtForBooking(booking);
  return closedAt !== null && new Date(closedAt).getTime() <= now - BOOKING_ARCHIVE_AFTER_MS;
}

export function filterBookingsByScope(
  bookings: BookingWithRelations[],
  scope: BookingListScope,
  now = Date.now()
): BookingWithRelations[] {
  if (scope === 'all') return bookings;
  return bookings.filter((booking) =>
    scope === 'archive' ? isBookingArchived(booking, now) : !isBookingArchived(booking, now)
  );
}

export interface BookingPet {
  id: string;
  name: string;
  species: string;
  avatar_url: string | null;
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

export interface BookingRequestGroup {
  id: string;
  primary: BookingWithRelations;
  bookings: BookingWithRelations[];
}

// Narrow embed: only the fields the UI needs. Related rows that RLS hides
// from the caller arrive as null instead of failing the whole query.
export const BOOKING_SELECT = [
  '*',
  'pet:pets!bookings_pet_id_fkey(id,name,species,avatar_url)',
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
  return addPetPhotoUrl(client, data as unknown as BookingWithRelations);
}

/** Loads all pet rows that belong to one multi-pet request. */
export async function fetchBookingGroup(
  client: SupabaseClient<Database>,
  bookingGroupId: string
): Promise<BookingWithRelations[]> {
  const { data, error } = await client
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('booking_group_id', bookingGroupId)
    .order('booking_group_position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return Promise.all(
    (data ?? []).map((booking) =>
      addPetPhotoUrl(client, booking as unknown as BookingWithRelations)
    )
  );
}

/** Collapses grouped rows for list views without merging independent requests. */
export function groupBookingsByRequest(bookings: BookingWithRelations[]): BookingRequestGroup[] {
  const groups = new Map<string, BookingWithRelations[]>();
  for (const booking of bookings) {
    const key = booking.booking_group_id ?? booking.id;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [booking]);
    else group.push(booking);
  }

  return [...groups.entries()]
    .map(([id, groupedBookings]) => ({
      id,
      primary: groupedBookings[0]!,
      bookings: groupedBookings,
    }))
    .sort(
      (left, right) =>
        new Date(right.primary.start_at).getTime() - new Date(left.primary.start_at).getTime()
    );
}

async function addPetPhotoUrl(
  client: SupabaseClient<Database>,
  booking: BookingWithRelations
): Promise<BookingWithRelations> {
  if (booking.pet?.avatar_url === null || booking.pet?.avatar_url === undefined) return booking;
  const signed = await client.storage
    .from('pet-photos')
    .createSignedUrl(booking.pet.avatar_url, 3600);
  return signed.error === null
    ? { ...booking, pet: { ...booking.pet, avatar_url: signed.data.signedUrl } }
    : booking;
}

/**
 * Loads the caller's bookings, newest first.
 * No explicit user filter: the "Participants read booking" RLS policy
 * already scopes rows to bookings where the caller is seeker or helper.
 * Throws on error.
 */
export async function fetchBookingsForUser(
  client: SupabaseClient<Database>,
  scope: BookingListScope = 'all'
): Promise<BookingWithRelations[]> {
  const { data, error } = await client
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('start_at', { ascending: false });

  if (error) throw error;
  const bookings = await Promise.all(
    (data ?? []).map((booking) =>
      addPetPhotoUrl(client, booking as unknown as BookingWithRelations)
    )
  );
  return filterBookingsByScope(bookings, scope);
}
