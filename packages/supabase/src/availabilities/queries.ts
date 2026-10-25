import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { BookingType } from '../bookings/creation';

export type Availability = Database['public']['Tables']['helper_availabilities']['Row'];

export const AVAILABILITY_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type AvailabilityDay = (typeof AVAILABILITY_DAYS)[number];

export const AVAILABILITY_BOOKING_TYPES: BookingType[] = [
  'walk',
  'feeding',
  'vacation',
  'daycare',
  'ride',
];
export const AVAILABILITY_PET_SPECIES = [
  'dog',
  'cat',
  'bird',
  'horse',
  'amphibian',
  'fish',
  'other',
] as const;

export interface UpsertAvailabilityInput {
  dayOfWeek: number;
  /** HH:MM, 24h. */
  startTime: string;
  /** HH:MM, 24h. Must be after startTime. */
  endTime: string;
  bookingTypes: BookingType[];
  maxDistanceKm: number;
  isActive?: boolean | undefined;
  petSpecies?: string[] | undefined;
}

const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function normalizeTime(value: string): string | null {
  const match = TIME_RE.exec(value.trim());
  if (match === null) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? '0');
  if (minutes > 59 || seconds > 59) return null;
  if (hours > 24) return null;
  if (hours === 24 && (minutes !== 0 || seconds !== 0)) return null;
  const padded = (part: number) => part.toString().padStart(2, '0');
  return `${padded(hours)}:${padded(minutes)}:${padded(seconds)}`;
}

export function validateAvailabilityInput(input: UpsertAvailabilityInput): string | null {
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return 'Bitte wähle einen Wochentag (So–Sa).';
  }
  const start = normalizeTime(input.startTime);
  const end = normalizeTime(input.endTime);
  if (start === null || end === null) {
    return 'Bitte gib Zeiten als HH:MM an.';
  }
  if (end <= start) {
    return 'Das Ende muss nach dem Beginn liegen.';
  }
  if (input.bookingTypes.length === 0) {
    return 'Bitte wähle mindestens eine Betreuungsart.';
  }
  if (input.petSpecies !== undefined && input.petSpecies.length === 0)
    return 'Bitte wähle mindestens eine Tierart.';
  if (input.bookingTypes.includes('ride') && !input.petSpecies?.includes('horse')) {
    return 'Ausreiten kann nur für Pferde angeboten werden.';
  }
  if (input.bookingTypes.includes('walk') && !input.petSpecies?.includes('dog')) {
    return 'Gassi kann nur für Hunde angeboten werden.';
  }
  for (const type of input.bookingTypes) {
    if (!AVAILABILITY_BOOKING_TYPES.includes(type)) {
      return `Unbekannte Betreuungsart: ${type}`;
    }
  }
  if (
    !Number.isFinite(input.maxDistanceKm) ||
    input.maxDistanceKm <= 0 ||
    input.maxDistanceKm > 50
  ) {
    return 'Der Maximalradius muss zwischen 0 und 50 km liegen.';
  }
  return null;
}

export interface AvailabilityTimeRange {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

function rangeMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

/**
 * Finds a slot on the same weekday whose time range overlaps the given range.
 * Paused slots also block a range, so re-activating them cannot create overlaps.
 */
export function findAvailabilityOverlap<T extends AvailabilityTimeRange>(
  slots: readonly T[],
  input: { dayOfWeek: number; startTime: string; endTime: string },
  excludeId?: string
): T | undefined {
  const start = rangeMinutes(input.startTime);
  const end = rangeMinutes(input.endTime);
  if (end <= start) return undefined;
  return slots.find((slot) => {
    if (slot.id === excludeId) return false;
    if (slot.day_of_week !== input.dayOfWeek) return false;
    const otherStart = rangeMinutes(slot.start_time);
    const otherEnd = rangeMinutes(slot.end_time);
    return start < otherEnd && end > otherStart;
  });
}

async function assertNoOverlap(
  client: SupabaseClient<Database>,
  helperId: string,
  dayOfWeek: number,
  start: string,
  end: string,
  excludeId?: string
): Promise<void> {
  let query = client
    .from('helper_availabilities')
    .select('id')
    .eq('helper_id', helperId)
    .eq('day_of_week', dayOfWeek)
    .lt('start_time', end)
    .gt('end_time', start);
  if (excludeId !== undefined) query = query.neq('id', excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  if ((data ?? []).length > 0) {
    throw new Error(
      'Dieser Zeitbereich überschneidet sich mit einem bestehenden Zeitfenster am selben Tag.'
    );
  }
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

/** Own recurring availabilities, ordered by weekday + start time. */
export async function fetchOwnAvailabilities(
  client: SupabaseClient<Database>
): Promise<Availability[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('helper_availabilities')
    .select('*')
    .eq('helper_id', userId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAvailability(
  client: SupabaseClient<Database>,
  input: UpsertAvailabilityInput
): Promise<Availability> {
  const validationError = validateAvailabilityInput(input);
  if (validationError !== null) throw new Error(validationError);
  const helperId = await requireUserId(client);
  const start = normalizeTime(input.startTime) as string;
  const end = normalizeTime(input.endTime) as string;
  await assertNoOverlap(client, helperId, input.dayOfWeek, start, end);
  const { data, error } = await client
    .from('helper_availabilities')
    .insert({
      helper_id: helperId,
      day_of_week: input.dayOfWeek,
      start_time: start,
      end_time: end,
      booking_types: input.bookingTypes,
      max_distance_km: input.maxDistanceKm,
      is_active: input.isActive ?? true,
      pet_species: input.petSpecies ?? [...AVAILABILITY_PET_SPECIES],
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateAvailability(
  client: SupabaseClient<Database>,
  id: string,
  input: Partial<UpsertAvailabilityInput>
): Promise<Availability> {
  const helperId = await requireUserId(client);
  const patch: Database['public']['Tables']['helper_availabilities']['Update'] = {};
  if (input.dayOfWeek !== undefined) {
    if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
      throw new Error('Bitte wähle einen Wochentag (So–Sa).');
    }
    patch.day_of_week = input.dayOfWeek;
  }
  if (input.startTime !== undefined) {
    const start = normalizeTime(input.startTime);
    if (start === null) throw new Error('Bitte gib Zeiten als HH:MM an.');
    patch.start_time = start;
  }
  if (input.endTime !== undefined) {
    const end = normalizeTime(input.endTime);
    if (end === null) throw new Error('Bitte gib Zeiten als HH:MM an.');
    patch.end_time = end;
  }
  if (input.bookingTypes !== undefined) {
    if (input.bookingTypes.length === 0)
      throw new Error('Bitte wähle mindestens eine Betreuungsart.');
    patch.booking_types = input.bookingTypes;
  }
  if (input.maxDistanceKm !== undefined) {
    if (
      !Number.isFinite(input.maxDistanceKm) ||
      input.maxDistanceKm <= 0 ||
      input.maxDistanceKm > 50
    ) {
      throw new Error('Der Maximalradius muss zwischen 0 und 50 km liegen.');
    }
    patch.max_distance_km = input.maxDistanceKm;
  }
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.petSpecies !== undefined) {
    if (input.petSpecies.length === 0) throw new Error('Bitte wähle mindestens eine Tierart.');
    patch.pet_species = input.petSpecies;
  }

  const changesRange =
    input.dayOfWeek !== undefined || input.startTime !== undefined || input.endTime !== undefined;
  if (changesRange) {
    const { data: existing, error: existingError } = await client
      .from('helper_availabilities')
      .select('*')
      .eq('id', id)
      .eq('helper_id', helperId)
      .single();
    if (existingError) throw existingError;
    const effectiveDay = patch.day_of_week ?? existing.day_of_week;
    const effectiveStart = patch.start_time ?? existing.start_time;
    const effectiveEnd = patch.end_time ?? existing.end_time;
    if (effectiveEnd <= effectiveStart) {
      throw new Error('Das Ende muss nach dem Beginn liegen.');
    }
    await assertNoOverlap(client, helperId, effectiveDay, effectiveStart, effectiveEnd, id);
  }

  const { data, error } = await client
    .from('helper_availabilities')
    .update(patch)
    .eq('id', id)
    .eq('helper_id', helperId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAvailability(
  client: SupabaseClient<Database>,
  id: string
): Promise<void> {
  const helperId = await requireUserId(client);
  const { error } = await client
    .from('helper_availabilities')
    .delete()
    .eq('id', id)
    .eq('helper_id', helperId);
  if (error) throw error;
}

export interface AvailabilitySlotLike {
  day_of_week: number;
  start_time: string;
  end_time: string;
  booking_types: string[];
  is_active?: boolean | undefined;
}

/**
 * Client-side check: does a booking window fall inside at least one active
 * slot of the helper (weekday + time + booking type)?
 * Times are compared in the booking's local Europe/Berlin wall clock.
 */
export function isBookingCoveredByAvailabilities(
  availabilities: AvailabilitySlotLike[],
  input: { startAt: string; endAt: string; type: BookingType }
): boolean {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return false;
  // Weekday in Europe/Berlin for recurring-slot matching (0 = Sunday).
  const berlinDay = berlinWeekday(start);
  const startHm = berlinTime(start);
  const endHm = berlinTime(end);
  // Multi-day bookings must be fully covered per-day is out of scope for the
  // recurring model; require same-day for a strict match.
  if (berlinDay !== berlinWeekday(end)) return false;
  return availabilities.some((slot) => {
    if (slot.is_active === false) return false;
    if (slot.day_of_week !== berlinDay) return false;
    if (!slot.booking_types.includes(input.type)) return false;
    return slot.start_time.slice(0, 5) <= startHm && endHm <= slot.end_time.slice(0, 5);
  });
}

function berlinWeekday(date: Date): number {
  // en-GB weekday short -> map to 0=Sun..6=Sat via explicit format.
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    So: 0,
    Mo: 1,
    Di: 2,
    Mi: 3,
    Do: 4,
    Fr: 5,
    Sa: 6,
  };
  return map[parts] ?? date.getDay();
}

function berlinTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return parts;
}
