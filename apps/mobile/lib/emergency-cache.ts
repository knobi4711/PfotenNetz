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
    if (typeof parsed !== 'object' || parsed === null || !('petId' in parsed)) return null;
    return parsed as EmergencyCardSnapshot;
  } catch {
    return null;
  }
}
