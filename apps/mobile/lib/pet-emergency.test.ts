import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Pet } from '@pfotennetz/supabase';
import {
  buildEmergencyCardSnapshot,
  calculatePetAge,
  formatEmergencyList,
  petToEmergencyCardData,
  snapshotToEmergencyCardData,
} from './pet-emergency';

const pet = {
  id: 'pet-1',
  owner_id: 'owner-1',
  name: 'Balu',
  species: 'dog',
  breed: 'Labrador',
  birth_date: '2020-05-10',
  weight_kg: 28,
  color: 'Schwarz',
  microchip_number: '276000000000000',
  tattoo_number: null,
  insurance_policy: 'Allianz',
  vet_clinic: 'Tierarzt am Park',
  vet_phone: '+49 30 123456',
  medications: ['Tablette morgens', '  ', 'Tropfen abends'],
  allergies: ['Huhn'],
  special_needs: 'Braucht viel Wasser.',
  emergency_card: {},
  avatar_url: null,
  is_active: true,
  is_deceased: false,
  tasso_number: 'T-12345',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} as Pet;

afterEach(() => {
  vi.useRealTimers();
});

describe('pet emergency card mapping', () => {
  it('calculates age from the birth date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'));
    expect(calculatePetAge('2020-05-10')).toBe('5 Jahre');

    vi.setSystemTime(new Date('2026-05-10T12:00:00.000Z'));
    expect(calculatePetAge('2020-05-10')).toBe('6 Jahre');
  });

  it('formats missing or empty lists', () => {
    expect(formatEmergencyList(null)).toBe('Keine Angaben');
    expect(formatEmergencyList(['Tablette', ' ', 3])).toBe('Tablette');
  });

  it('maps a pet row to display data', () => {
    const card = petToEmergencyCardData(pet);
    expect(card).toMatchObject({
      petId: 'pet-1',
      name: 'Balu',
      species: 'dog',
      color: 'Schwarz',
      statusLabel: 'Aktiv',
      medications: ['Tablette morgens', 'Tropfen abends'],
      allergies: ['Huhn'],
      tassoNumber: 'T-12345',
    });
  });

  it('stores only the fields needed for offline use', () => {
    const snapshot = buildEmergencyCardSnapshot(pet);
    expect(snapshot).toMatchObject({
      petId: 'pet-1',
      name: 'Balu',
      medications: ['Tablette morgens', 'Tropfen abends'],
      allergies: ['Huhn'],
      vetPhone: '+49 30 123456',
    });
    expect(snapshot).not.toHaveProperty('owner_id');
    expect(snapshot).not.toHaveProperty('emergency_card');
  });

  it('maps a cached snapshot back to display data', () => {
    const snapshot = buildEmergencyCardSnapshot(pet);
    expect(snapshotToEmergencyCardData(snapshot)).toMatchObject({
      petId: 'pet-1',
      name: 'Balu',
      medications: ['Tablette morgens', 'Tropfen abends'],
      statusLabel: null,
      avatarUrl: null,
    });
  });
});
