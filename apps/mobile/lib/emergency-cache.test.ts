import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => secureStore);

import {
  loadBookingEmergencyPets,
  loadEmergencyCardSnapshot,
  saveBookingEmergencyPets,
  saveEmergencyCardSnapshot,
} from './emergency-cache';

const card = {
  petId: 'pet-1',
  name: 'Milo',
  species: 'dog',
  breed: null,
  birthDate: null,
  microchipNumber: '123',
  tassoNumber: 'T-123',
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

  it('remembers the pets of a booking for offline use', async () => {
    await saveBookingEmergencyPets(
      'booking-1',
      ['pet-1', 'pet-2', 'pet-1'],
      '2099-01-01T00:00:00.000Z'
    );

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'pfotennetz.emergency.booking.booking-1',
      expect.any(String)
    );
    const stored = JSON.parse(secureStore.setItemAsync.mock.calls[0]?.[1] as string);
    expect(stored).toMatchObject({
      bookingId: 'booking-1',
      petIds: ['pet-1', 'pet-2'],
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(stored));
    await expect(loadBookingEmergencyPets('booking-1')).resolves.toEqual(['pet-1', 'pet-2']);
  });

  it('ignores an expired booking cache', async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(
      JSON.stringify({
        bookingId: 'booking-1',
        petIds: ['pet-1'],
        expiresAt: '2000-01-01T00:00:00.000Z',
        savedAt: '1999-12-01T00:00:00.000Z',
      })
    );
    await expect(loadBookingEmergencyPets('booking-1')).resolves.toEqual([]);
  });

  it('returns no pet ids for a malformed booking cache', async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify({ bookingId: 'booking-1' }));
    await expect(loadBookingEmergencyPets('booking-1')).resolves.toEqual([]);
  });
});
