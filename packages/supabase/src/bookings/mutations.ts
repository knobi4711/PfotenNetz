import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { Booking } from './queries';

// SECURITY NOTE: every wrapper below calls exactly ONE whitelisted booking RPC
// by literal name (fully type-checked against the generated Database types).
// Nothing here calls timebank_adjust(), UPDATEs bookings directly, or touches
// timebank_accounts / timebank_transactions. Settlement stays server-side.

function unwrapBooking<TBooking extends Booking>(result: {
  data: TBooking | null;
  error: PostgrestError | null;
}): Booking {
  if (result.error) throw result.error;
  if (result.data === null) throw new Error('Booking RPC returned no booking');
  return result.data;
}

/** Helper accepts a requested booking (requested -> confirmed). */
export async function acceptBooking(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<Booking> {
  return unwrapBooking(
    await client.rpc('helper_accept_booking', { p_booking_id: bookingId }).single()
  );
}

/** Helper starts a confirmed booking (confirmed -> in_progress). */
export async function startBooking(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<Booking> {
  return unwrapBooking(
    await client.rpc('helper_start_booking', { p_booking_id: bookingId }).single()
  );
}

/**
 * Helper completes an in-progress booking (in_progress -> completed).
 * The server settles KIEZ_HOURS atomically inside this RPC; the client
 * only re-reads the returned booking and invalidates its caches.
 */
export async function completeBooking(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<Booking> {
  return unwrapBooking(
    await client.rpc('helper_complete_booking', { p_booking_id: bookingId }).single()
  );
}

/** Helper rejects a requested booking (requested -> cancelled). */
export async function rejectBooking(
  client: SupabaseClient<Database>,
  bookingId: string,
  reason?: string
): Promise<Booking> {
  const args =
    reason === undefined
      ? { p_booking_id: bookingId }
      : { p_booking_id: bookingId, p_reason: reason };
  return unwrapBooking(await client.rpc('helper_reject_booking', args).single());
}

/** Seeker cancels a booking (requested/confirmed -> cancelled). */
export async function cancelBooking(
  client: SupabaseClient<Database>,
  bookingId: string,
  reason?: string
): Promise<Booking> {
  const args =
    reason === undefined
      ? { p_booking_id: bookingId }
      : { p_booking_id: bookingId, p_reason: reason };
  return unwrapBooking(await client.rpc('seeker_cancel_booking', args).single());
}

/** Seeker rates the helper after completion (rating 1-5, server-validated). */
export async function rateHelper(
  client: SupabaseClient<Database>,
  bookingId: string,
  rating: number,
  review?: string
): Promise<Booking> {
  const args =
    review === undefined
      ? { p_booking_id: bookingId, p_rating: rating }
      : { p_booking_id: bookingId, p_rating: rating, p_review: review };
  return unwrapBooking(await client.rpc('seeker_rate_helper', args).single());
}

/** Helper rates the seeker after completion (rating 1-5, server-validated). */
export async function rateSeeker(
  client: SupabaseClient<Database>,
  bookingId: string,
  rating: number,
  review?: string
): Promise<Booking> {
  const args =
    review === undefined
      ? { p_booking_id: bookingId, p_rating: rating }
      : { p_booking_id: bookingId, p_rating: rating, p_review: review };
  return unwrapBooking(await client.rpc('helper_rate_seeker', args).single());
}
