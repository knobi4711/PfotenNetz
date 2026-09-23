import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { Booking } from './queries';

export type BookingType = Database['public']['Enums']['booking_type'];
export type BookingCurrency = Database['public']['Enums']['currency'];

export const BOOKING_TYPES: BookingType[] = ['walk', 'feeding', 'vacation', 'daycare'];

export interface CreateBookingInput {
  type: BookingType;
  petId: string;
  /** ISO-8601 timestamps, end must be after start. */
  startAt: string;
  endAt: string;
  meetingAddress?: string | null | undefined;
  currency: BookingCurrency;
  /** Euros as decimal (e.g. 12.5); only used when currency is EUR. */
  priceEur?: number | undefined;
  /** Kiez-Hours as decimal; only used when currency is KIEZ_HOURS. */
  priceKiezHours?: number | undefined;
  /** Optional pre-selected helper from the map search (must differ from seeker). */
  helperId?: string | null | undefined;
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

/** Generates a unique, human-readable booking number (uniqueness enforced by DB). */
export function generateBookingNumber(now: Date = new Date(), randomPart?: string): string {
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random =
    randomPart ??
    Math.floor(Math.random() * 36 ** 4)
      .toString(36)
      .toUpperCase()
      .padStart(4, '0');
  return `BK-${date}-${random}`;
}

export function validateCreateBooking(input: CreateBookingInput): string | null {
  const start = new Date(input.startAt).getTime();
  const end = new Date(input.endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 'Bitte gib gültige Start- und Endzeiten an.';
  }
  if (end <= start) {
    return 'Das Ende muss nach dem Beginn liegen.';
  }
  if (input.currency === 'EUR') {
    if (input.priceEur === undefined || !Number.isFinite(input.priceEur) || input.priceEur <= 0) {
      return 'Bitte gib einen Preis über 0 € an.';
    }
  } else if (
    input.priceKiezHours !== undefined &&
    (!Number.isFinite(input.priceKiezHours) || input.priceKiezHours < 0)
  ) {
    return 'Bitte gib gültige Nachbarschafts-Stunden an.';
  }
  if (input.meetingAddress !== undefined && input.meetingAddress !== null) {
    const address = input.meetingAddress.trim();
    if (address.length > 0 && address.length < 5) {
      return 'Der Treffpunkt muss mindestens 5 Zeichen lang sein.';
    }
  }
  return null;
}

/**
 * Creates a booking as the seeker (status 'requested', optional helper assigned).
 * The pet must be an active pet owned by the caller; the server re-validates
 * ownership, time range and initial status via trigger.
 */
export async function createBooking(
  client: SupabaseClient<Database>,
  input: CreateBookingInput
): Promise<Booking> {
  const validationError = validateCreateBooking(input);
  if (validationError !== null) throw new Error(validationError);

  const seekerId = await requireUserId(client);

  if (input.helperId !== undefined && input.helperId !== null && input.helperId === seekerId) {
    throw new Error('Du kannst dich nicht selbst als Helper auswählen.');
  }

  const { data: pet, error: petError } = await client
    .from('pets')
    .select('id,owner_id,is_active')
    .eq('id', input.petId)
    .maybeSingle();
  if (petError) throw petError;
  if (pet === null) throw new Error('Tier nicht gefunden.');
  if (pet.owner_id !== seekerId) throw new Error('Das Tier gehört nicht zu deinem Konto.');
  if (pet.is_active !== true) throw new Error('Das Tier ist pausiert.');

  const address = input.meetingAddress?.trim();
  const { data, error } = await client
    .from('bookings')
    .insert({
      booking_number: generateBookingNumber(),
      type: input.type,
      seeker_id: seekerId,
      helper_id: input.helperId ?? null,
      pet_id: input.petId,
      start_at: input.startAt,
      end_at: input.endAt,
      meeting_address: address !== undefined && address !== '' ? address : null,
      price_eur_cents: input.currency === 'EUR' ? Math.round((input.priceEur ?? 0) * 100) : 0,
      price_kiez_hours: input.currency === 'KIEZ_HOURS' ? (input.priceKiezHours ?? 0) : 0,
      currency: input.currency,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
