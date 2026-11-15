import type { Pet } from '@pfotennetz/supabase';
import type { EmergencyCardSnapshot } from './emergency-cache';

/** Display-ready emergency card data for one pet. */
export interface PetEmergencyCardData {
  petId: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  birthDate: string | null;
  microchipNumber: string | null;
  tassoNumber: string | null;
  medications: string[];
  allergies: string[];
  vetClinic: string | null;
  vetPhone: string | null;
  insurancePolicy: string | null;
  specialNeeds: string | null;
  avatarUrl: string | null;
  statusLabel: string | null;
}

export function calculatePetAge(birthDate: string | null): string {
  if (!birthDate) return 'Nicht angegeben';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 'Nicht angegeben';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? `${age} Jahre` : 'Nicht angegeben';
}

export function formatEmergencyList(value: unknown): string {
  if (!Array.isArray(value)) return 'Keine Angaben';
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  );
  return items.length > 0 ? items.join(', ') : 'Keine Angaben';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];
}

export function petToEmergencyCardData(pet: Pet): PetEmergencyCardData {
  return {
    petId: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    color: pet.color,
    birthDate: pet.birth_date,
    microchipNumber: pet.microchip_number,
    tassoNumber: pet.tasso_number,
    medications: stringList(pet.medications),
    allergies: pet.allergies ?? [],
    vetClinic: pet.vet_clinic,
    vetPhone: pet.vet_phone,
    insurancePolicy: pet.insurance_policy,
    specialNeeds: pet.special_needs,
    avatarUrl: pet.avatar_url,
    statusLabel: pet.is_deceased ? 'Verstorben' : pet.is_active ? 'Aktiv' : 'Pausiert',
  };
}

export function snapshotToEmergencyCardData(snapshot: EmergencyCardSnapshot): PetEmergencyCardData {
  return {
    petId: snapshot.petId,
    name: snapshot.name,
    species: snapshot.species,
    breed: snapshot.breed,
    color: null,
    birthDate: snapshot.birthDate,
    microchipNumber: snapshot.microchipNumber,
    tassoNumber: snapshot.tassoNumber,
    medications: snapshot.medications,
    allergies: snapshot.allergies,
    vetClinic: snapshot.vetClinic,
    vetPhone: snapshot.vetPhone,
    insurancePolicy: snapshot.insurancePolicy,
    specialNeeds: snapshot.specialNeeds,
    avatarUrl: null,
    statusLabel: null,
  };
}

export function buildEmergencyCardSnapshot(pet: Pet): EmergencyCardSnapshot {
  return {
    petId: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    birthDate: pet.birth_date,
    microchipNumber: pet.microchip_number,
    tassoNumber: pet.tasso_number,
    medications: stringList(pet.medications),
    allergies: pet.allergies ?? [],
    vetClinic: pet.vet_clinic,
    vetPhone: pet.vet_phone,
    insurancePolicy: pet.insurance_policy,
    specialNeeds: pet.special_needs,
    savedAt: new Date().toISOString(),
  };
}
