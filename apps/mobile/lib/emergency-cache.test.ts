import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => secureStore);

import { loadEmergencyCardSnapshot, saveEmergencyCardSnapshot } from './emergency-cache';

const card = {
  petId: 'pet-1',
  name: 'Milo',
  species: 'dog',
  breed: null,
  birthDate: null,
  microchipNumber: '123',
  medications: ['Tablette'],
  allergies: [],
  vetClinic: null,
  vetPhone: null,
  insurancePolicy: null,
  specialNeeds: null,
  savedAt: '2026-09-25T10:00:00.000Z',
};

describe('emergency card cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves and loads a complete offline card', async () => {
    await saveEmergencyCardSnapshot(card);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'pfotennetz.emergency.pet-1',
      JSON.stringify(card)
    );

    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(card));
    await expect(loadEmergencyCardSnapshot('pet-1')).resolves.toEqual(card);
  });

  it('ignores malformed cached data', async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify({ petId: 'pet-1' }));
    await expect(loadEmergencyCardSnapshot('pet-1')).resolves.toBeNull();
  });
});
