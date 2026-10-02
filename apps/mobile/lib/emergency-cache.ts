import * as SecureStore from 'expo-secure-store';

export type EmergencyCardSnapshot = {
  petId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  microchipNumber: string | null;
  medications: string[];
  allergies: string[];
  vetClinic: string | null;
  vetPhone: string | null;
  insurancePolicy: string | null;
  specialNeeds: string | null;
  savedAt: string;
};

const storageKey = (petId: string) => `pfotennetz.emergency.${petId}`;

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
