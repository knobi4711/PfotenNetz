import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { Booking } from './queries';

export type BookingType = Database['public']['Enums']['booking_type'];
export type BookingCurrency = Database['public']['Enums']['currency'];
export type CareLocation = Database['public']['Tables']['bookings']['Row']['care_location'];

export const BOOKING_TYPES: BookingType[] = ['walk', 'feeding', 'vacation', 'daycare'];

export interface CreateBookingInput {
  type: BookingType;
  /** One or more active pets. Several pets are stored as one grouped request. */
  petIds: string[];
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
  /** Marks a genuine time-critical care request for nearby push notifications. */
  isUrgent?: boolean | undefined;
  /** Care instructions and needs shared with the selected helper. */
  careNotes?: string | null | undefined;
  /** Where longer-term care takes place: owner's home or helper's home. */
  careLocation?: CareLocation | undefined;
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
  const petIds = [...new Set(input.petIds)];
  if (petIds.length === 0) return 'Bitte wähle mindestens ein Tier aus.';
  const start = new Date(input.startAt).getTime();
  const end = new Date(input.endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 'Bitte gib gültige Start- und Endzeiten an.';
  }
  if (end <= start) {
    return 'Das Ende muss nach dem Beginn liegen.';
  }
  if (input.currency === 'EUR' || input.currency === 'PER_VISIT') {
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
  if (input.careNotes !== undefined && input.careNotes !== null && input.careNotes.length > 2000) {
    return 'Die Betreuungsnotiz darf höchstens 2.000 Zeichen enthalten.';
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

  const petIds = [...new Set(input.petIds)];
  let pets: Array<{
    id: string;
    owner_id: string;
    is_active: boolean;
    is_deceased: boolean;
  }> = [];

  if (petIds.length === 1) {
    const petId = petIds[0];
    if (petId === undefined) throw new Error('Bitte wähle mindestens ein Tier aus.');
    const { data: pet, error: petError } = await client
      .from('pets')
      .select('id,owner_id,is_active,is_deceased')
      .eq('id', petId)
      .maybeSingle();
    if (petError) throw petError;
    if (pet !== null) pets = [pet];
  } else {
    const { data: selectedPets, error: petError } = await client
      .from('pets')
      .select('id,owner_id,is_active,is_deceased')
      .in('id', petIds);
    if (petError) throw petError;
    pets = selectedPets ?? [];
  }

  if (pets.length !== petIds.length)
    throw new Error('Mindestens eines der Tiere wurde nicht gefunden.');
  for (const pet of pets) {
    if (pet.owner_id !== seekerId) throw new Error('Das Tier gehört nicht zu deinem Konto.');
    if (pet.is_deceased === true)
      throw new Error('Für verstorbene Tiere sind keine neuen Aufträge möglich.');
    if (pet.is_active !== true) throw new Error('Mindestens eines der Tiere ist pausiert.');
  }

  const address = input.meetingAddress?.trim();
  const bookingGroupId = petIds.length > 1 ? generateBookingGroupId() : null;
  const priceEurCents =
    input.currency === 'EUR' || input.currency === 'PER_VISIT'
      ? Math.round((input.priceEur ?? 0) * 100)
      : 0;
  const priceKiezHours = input.currency === 'KIEZ_HOURS' ? (input.priceKiezHours ?? 0) : 0;
  const common = {
    type: input.type,
    seeker_id: seekerId,
    helper_id: input.helperId ?? null,
    start_at: input.startAt,
    end_at: input.endAt,
    meeting_address: address !== undefined && address !== '' ? address : null,
    currency: input.currency,
    is_urgent: input.isUrgent ?? false,
    care_notes: input.careNotes?.trim() || null,
    ...(input.careLocation !== undefined ? { care_location: input.careLocation } : {}),
  };
  const rows = petIds.map((petId, index) => ({
    ...common,
    booking_number: generateBookingNumber(
      new Date(),
      `${index.toString(36)}${Math.floor(Math.random() * 36 ** 3)
        .toString(36)
        .toUpperCase()
        .padStart(3, '0')}`
    ),
    pet_id: petId,
    booking_group_id: bookingGroupId,
    booking_group_position: index,
    // The amount describes the complete grouped request. The server settles
    // only position zero, so it is not charged once per animal.
    price_eur_cents: priceEurCents,
    price_kiez_hours: priceKiezHours,
  }));

  if (rows.length === 1) {
    const firstRow = rows[0];
    if (firstRow === undefined) throw new Error('Die Anfrage konnte nicht erstellt werden.');
    const { data, error } = await client.from('bookings').insert(firstRow).select('*').single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await client.from('bookings').insert(rows).select('*');
  if (error) throw error;
  if (data === null || data.length === 0)
    throw new Error('Die Anfrage konnte nicht erstellt werden.');
  const firstBooking = data[0];
  if (firstBooking === undefined) throw new Error('Die Anfrage konnte nicht erstellt werden.');
  return firstBooking;
}

function generateBookingGroupId(): string {
  // Avoid requiring a native crypto module in the Expo client; PostgreSQL
  // still validates the UUID format and uses it only as a grouping key.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
