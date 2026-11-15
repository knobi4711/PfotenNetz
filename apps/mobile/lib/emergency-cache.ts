import * as SecureStore from 'expo-secure-store';

export type EmergencyCardSnapshot = {
  petId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  microchipNumber: string | null;
  tassoNumber: string | null;
  medications: string[];
  allergies: string[];
  vetClinic: string | null;
  vetPhone: string | null;
  insurancePolicy: string | null;
  specialNeeds: string | null;
  savedAt: string;
};

export type BookingEmergencyCache = {
  bookingId: string;
  petIds: string[];
  /** After this point the cached card list is no longer shown. */
  expiresAt: string | null;
  savedAt: string;
};

const storageKey = (petId: string) => `pfotennetz.emergency.${petId}`;
const bookingStorageKey = (bookingId: string) => `pfotennetz.emergency.booking.${bookingId}`;

function isEmergencyCardSnapshot(value: unknown): value is EmergencyCardSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const card = value as Partial<EmergencyCardSnapshot>;
  return (
    typeof card.petId === 'string' &&
    typeof card.name === 'string' &&
    typeof card.species === 'string' &&
    (card.breed === null || typeof card.breed === 'string') &&
    (card.birthDate === null || typeof card.birthDate === 'string') &&
    (card.microchipNumber === null || typeof card.microchipNumber === 'string') &&
    (card.tassoNumber === null || typeof card.tassoNumber === 'string') &&
    Array.isArray(card.medications) &&
    card.medications.every((item) => typeof item === 'string') &&
    Array.isArray(card.allergies) &&
    card.allergies.every((item) => typeof item === 'string') &&
    (card.vetClinic === null || typeof card.vetClinic === 'string') &&
    (card.vetPhone === null || typeof card.vetPhone === 'string') &&
    (card.insurancePolicy === null || typeof card.insurancePolicy === 'string') &&
    (card.specialNeeds === null || typeof card.specialNeeds === 'string') &&
    typeof card.savedAt === 'string'
  );
}

function isBookingEmergencyCache(value: unknown): value is BookingEmergencyCache {
  if (typeof value !== 'object' || value === null) return false;
  const cache = value as Partial<BookingEmergencyCache>;
  return (
    typeof cache.bookingId === 'string' &&
    Array.isArray(cache.petIds) &&
    cache.petIds.every((petId) => typeof petId === 'string') &&
    (cache.expiresAt === null || typeof cache.expiresAt === 'string') &&
    typeof cache.savedAt === 'string'
  );
}

/** Remembers which pets belong to a booking so a helper can find them offline. */
export async function saveBookingEmergencyPets(
  bookingId: string,
  petIds: readonly string[],
  expiresAt: string | null
): Promise<void> {
  const cache: BookingEmergencyCache = {
    bookingId,
    petIds: [...new Set(petIds)],
    expiresAt,
    savedAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(bookingStorageKey(bookingId), JSON.stringify(cache));
}

/** Pet ids of a booking that were cached while the helper was authorized. */
export async function loadBookingEmergencyPets(bookingId: string): Promise<string[]> {
  const value = await SecureStore.getItemAsync(bookingStorageKey(bookingId));
  if (value === null) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isBookingEmergencyCache(parsed)) return [];
    if (parsed.expiresAt !== null && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      return [];
    }
    return parsed.petIds;
  } catch {
    return [];
  }
}

export async function saveEmergencyCardSnapshot(snapshot: EmergencyCardSnapshot): Promise<void> {
  await SecureStore.setItemAsync(storageKey(snapshot.petId), JSON.stringify(snapshot));
}

export async function loadEmergencyCardSnapshot(
  petId: string
): Promise<EmergencyCardSnapshot | null> {
  const value = await SecureStore.getItemAsync(storageKey(petId));
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isEmergencyCardSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
