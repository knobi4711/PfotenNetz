import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { Booking } from './queries';

// SECURITY NOTE: every wrapper below calls exactly ONE whitelisted booking RPC
// by literal name (fully type-checked against the generated Database types).
// Nothing here calls timebank_adjust(), UPDATEs bookings directly, or touches
// timebank_accounts / timebank_transactions. Settlement stays server-side.

function unwrapBooking<TBooking extends Database['public']['Tables']['bookings']['Row']>(result: {
  data: TBooking | null;
  error: PostgrestError | null;
}): Booking {
  if (result.error) throw result.error;
  if (result.data === null) throw new Error('Booking RPC returned no booking');
  return result.data as Booking;
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

export interface UpdateBookingRequestInput {
  bookingId: string;
  type: Database['public']['Enums']['booking_type'];
  startAt: string;
  endAt: string;
  meetingAddress?: string | null;
  currency: Database['public']['Enums']['currency'];
  priceEurCents?: number;
  priceKiezHours?: number;
  isUrgent?: boolean;
  careNotes?: string | null;
  careLocation?: Database['public']['Tables']['bookings']['Row']['care_location'];
}

/** Seeker edits their own still-requested booking request. */
export async function updateBookingRequest(
  client: SupabaseClient<Database>,
  input: UpdateBookingRequestInput
): Promise<Booking> {
  const priceEurCents =
    input.currency === 'EUR' || input.currency === 'PER_VISIT' ? (input.priceEurCents ?? 0) : 0;
  const priceKiezHours = input.currency === 'KIEZ_HOURS' ? (input.priceKiezHours ?? 0) : 0;

  return unwrapBooking(
    await client
      .rpc('seeker_update_booking_request', {
        p_booking_id: input.bookingId,
        p_type: input.type,
        p_start_at: input.startAt,
        p_end_at: input.endAt,
        p_meeting_address: input.meetingAddress ?? null,
        p_currency: input.currency,
        p_price_eur_cents: priceEurCents,
        p_price_kiez_hours: priceKiezHours,
        p_is_urgent: input.isUrgent ?? false,
        p_care_notes: input.careNotes ?? null,
        p_care_location: input.careLocation ?? 'at_owner_home',
      })
      .single()
  );
}

export interface BookingRatingInput {
  bookingId: string;
  friendliness: number;
  reliability: number;
  animalCare: number;
  communication: number;
  review?: string;
}

/** Seeker rates the helper after completion; every criterion is 1-5. */
export async function rateHelper(
  client: SupabaseClient<Database>,
  input: BookingRatingInput
): Promise<Booking> {
  return unwrapBooking(
    await client
      .rpc('seeker_rate_helper', {
        p_booking_id: input.bookingId,
        p_friendliness: input.friendliness,
        p_reliability: input.reliability,
        p_animal_care: input.animalCare,
        p_communication: input.communication,
        ...(input.review === undefined ? {} : { p_review: input.review }),
      })
      .single()
  );
}

/** Helper rates the seeker after completion; every criterion is 1-5. */
export async function rateSeeker(
  client: SupabaseClient<Database>,
  input: BookingRatingInput
): Promise<Booking> {
  return unwrapBooking(
    await client
      .rpc('helper_rate_seeker', {
        p_booking_id: input.bookingId,
        p_friendliness: input.friendliness,
        p_reliability: input.reliability,
        p_animal_care: input.animalCare,
        p_communication: input.communication,
        ...(input.review === undefined ? {} : { p_review: input.review }),
      })
      .single()
  );
}
