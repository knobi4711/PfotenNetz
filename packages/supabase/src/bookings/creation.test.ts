import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import {
  createBooking,
  formatTrackingRadius,
  generateBookingNumber,
  parseTrackingRadiusKm,
  validateBookingPetCompatibility,
  validateCreateBooking,
} from './creation';

function clientWithStubs(stubs: {
  userId: string | null;
  pet: unknown;
  booking: unknown;
  hasPrivateAddress?: boolean;
}) {
  const inserts: { table: string; values: unknown }[] = [];
  const petResult = { data: stubs.pet, error: null };
  const bookingResult = { data: stubs.booking, error: null };
  const client = {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: stubs.userId === null ? null : { id: stubs.userId } } }),
    },
    from: (table: string) => {
      if (table === 'private_profile_addresses') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: stubs.hasPrivateAddress === false ? null : { profile_id: stubs.userId },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'pets') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(petResult),
            }),
          }),
        };
      }
      return {
        insert: (values: unknown) => {
          inserts.push({ table, values });
          return {
            select: () => ({
              single: () => Promise.resolve(bookingResult),
            }),
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return { client, inserts };
}

const validInput = {
  type: 'walk' as const,
  petIds: ['pet-1'],
  startAt: '2026-10-01T10:00:00.000Z',
  endAt: '2026-10-01T12:00:00.000Z',
  currency: 'KIEZ_HOURS' as const,
  priceKiezHours: 2,
};

describe('booking creation', () => {
  it('generates readable unique-ish booking numbers', () => {
    const first = generateBookingNumber(new Date('2026-09-22T10:00:00Z'), 'AB12');
    const second = generateBookingNumber(new Date('2026-09-22T10:00:00Z'), 'CD34');
    expect(first).toBe('BK-20260922-AB12');
    expect(second).not.toBe(first);
  });

  it('rejects an end before start', () => {
    expect(validateCreateBooking({ ...validInput, endAt: validInput.startAt })).not.toBeNull();
    expect(validateCreateBooking(validInput)).toBeNull();
  });

  it('requires a positive EUR price for EUR bookings', () => {
    expect(validateCreateBooking({ ...validInput, currency: 'EUR', priceEur: 0 })).not.toBeNull();
    expect(validateCreateBooking({ ...validInput, currency: 'EUR', priceEur: 12.5 })).toBeNull();
  });

  it('validates the safety zone radius', () => {
    expect(validateCreateBooking({ ...validInput, trackingRadiusM: 1000 })).toBeNull();
    expect(validateCreateBooking({ ...validInput, trackingRadiusM: 100 })).toBeNull();
    expect(validateCreateBooking({ ...validInput, trackingRadiusM: 10000 })).toBeNull();
    expect(validateCreateBooking({ ...validInput, trackingRadiusM: 50 })).not.toBeNull();
    expect(validateCreateBooking({ ...validInput, trackingRadiusM: 10001 })).not.toBeNull();
    expect(validateCreateBooking({ ...validInput, trackingRadiusM: Number.NaN })).not.toBeNull();
  });

  it('formats safety zone radii in German units', () => {
    expect(formatTrackingRadius(100)).toBe('100 m');
    expect(formatTrackingRadius(500)).toBe('500 m');
    expect(formatTrackingRadius(1000)).toBe('1 km');
    expect(formatTrackingRadius(2000)).toBe('2 km');
    expect(formatTrackingRadius(4000)).toBe('4 km');
    expect(formatTrackingRadius(1500)).toBe('1,5 km');
    expect(formatTrackingRadius(10000)).toBe('10 km');
  });

  it('parses a free-form radius in kilometers', () => {
    expect(parseTrackingRadiusKm('1')).toBe(1000);
    expect(parseTrackingRadiusKm('2,5')).toBe(2500);
    expect(parseTrackingRadiusKm('3.5')).toBe(3500);
    expect(parseTrackingRadiusKm(' 10 ')).toBe(10000);
    expect(parseTrackingRadiusKm('0,05')).toBeNull();
    expect(parseTrackingRadiusKm('11')).toBeNull();
    expect(parseTrackingRadiusKm('')).toBeNull();
    expect(parseTrackingRadiusKm('drei')).toBeNull();
  });

  it('allows walks only for dogs', () => {
    expect(validateBookingPetCompatibility('walk', ['dog'])).toBeNull();
    expect(validateBookingPetCompatibility('walk', ['bird'])).toContain('nur für Hunde');
    expect(validateBookingPetCompatibility('walk', ['dog', 'rabbit'])).not.toBeNull();
    expect(validateBookingPetCompatibility('feeding', ['bird', 'rabbit'])).toBeNull();
  });

  it('allows riding only for horses', () => {
    expect(validateBookingPetCompatibility('ride', ['horse'])).toBeNull();
    expect(validateBookingPetCompatibility('ride', ['dog'])).toContain('nur mit Pferden');
    expect(validateBookingPetCompatibility('ride', ['horse', 'dog'])).not.toBeNull();
    expect(validateBookingPetCompatibility('feeding', ['fish'])).toBeNull();
  });

  it('creates a requested booking for an owned active pet', async () => {
    const booking = { id: 'booking-1', status: 'requested' };
    const { client, inserts } = clientWithStubs({
      userId: 'user-1',
      pet: { id: 'pet-1', owner_id: 'user-1', is_active: true, species: 'dog' },
      booking,
    });

    const result = await createBooking(client, validInput);

    expect(result).toEqual(booking);
    expect(inserts).toHaveLength(1);
    const values = inserts[0]?.values as Record<string, unknown>;
    expect(values['seeker_id']).toBe('user-1');
    expect(values['pet_id']).toBe('pet-1');
    expect(values['currency']).toBe('KIEZ_HOURS');
    expect(values['price_kiez_hours']).toBe(2);
    expect(values['tracking_radius_m']).toBe(1000);
    expect(values['booking_number']).toMatch(/^BK-\d{8}-[A-Z0-9]{4}$/);
  });

  it('stores a custom safety zone radius', async () => {
    const { client, inserts } = clientWithStubs({
      userId: 'user-1',
      pet: { id: 'pet-1', owner_id: 'user-1', is_active: true, species: 'dog' },
      booking: { id: 'booking-1', status: 'requested' },
    });

    await createBooking(client, { ...validInput, trackingRadiusM: 4000 });

    const values = inserts[0]?.values as Record<string, unknown>;
    expect(values['tracking_radius_m']).toBe(4000);
  });

  it('refuses foreign pets before any insert', async () => {
    const { client, inserts } = clientWithStubs({
      userId: 'user-1',
      pet: { id: 'pet-1', owner_id: 'user-2', is_active: true, species: 'dog' },
      booking: null,
    });

    await expect(createBooking(client, validInput)).rejects.toThrow(
      'Das Tier gehört nicht zu deinem Konto.'
    );
    expect(inserts).toHaveLength(0);
  });

  it('refuses paused pets', async () => {
    const { client } = clientWithStubs({
      userId: 'user-1',
      pet: { id: 'pet-1', owner_id: 'user-1', is_active: false, species: 'dog' },
      booking: null,
    });

    await expect(createBooking(client, validInput)).rejects.toThrow('pausiert');
  });

  it('requires a saved private address before publishing a request', async () => {
    const { client, inserts } = clientWithStubs({
      userId: 'user-1',
      pet: { id: 'pet-1', owner_id: 'user-1', is_active: true, species: 'dog' },
      booking: null,
      hasPrivateAddress: false,
    });
    await expect(createBooking(client, validInput)).rejects.toThrow('private Wohnadresse');
    expect(inserts).toHaveLength(0);
  });

  it('converts EUR prices to cents', async () => {
    const booking = { id: 'booking-1' };
    const { client, inserts } = clientWithStubs({
      userId: 'user-1',
      pet: { id: 'pet-1', owner_id: 'user-1', is_active: true, species: 'dog' },
      booking,
    });

    await createBooking(client, { ...validInput, currency: 'EUR', priceEur: 12.5 });

    const values = inserts[0]?.values as Record<string, unknown>;
    expect(values['price_eur_cents']).toBe(1250);
    expect(values['price_kiez_hours']).toBe(0);
  });

  it('creates one grouped request for multiple owned pets', async () => {
    const inserted: { table: string; values: unknown }[] = [];
    const client = {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
      },
      from: (table: string) => {
        if (table === 'private_profile_addresses') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { profile_id: 'user-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pets') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 'pet-1',
                      owner_id: 'user-1',
                      is_active: true,
                      is_deceased: false,
                      species: 'dog',
                    },
                    {
                      id: 'pet-2',
                      owner_id: 'user-1',
                      is_active: true,
                      is_deceased: false,
                      species: 'dog',
                    },
                  ],
                  error: null,
                }),
            }),
          };
        }
        return {
          insert: (values: unknown) => {
            inserted.push({ table, values });
            return {
              select: () =>
                Promise.resolve({
                  data: [
                    { id: 'booking-1', status: 'requested' },
                    { id: 'booking-2', status: 'requested' },
                  ],
                  error: null,
                }),
            };
          },
        };
      },
    } as unknown as SupabaseClient<Database>;

    const result = await createBooking(client, { ...validInput, petIds: ['pet-1', 'pet-2'] });
    const rows = inserted[0]?.values as Array<Record<string, unknown>>;

    expect(result.id).toBe('booking-1');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.booking_group_id).toBeTruthy();
    expect(rows[0]?.booking_group_id).toBe(rows[1]?.booking_group_id);
    expect(rows[0]?.booking_group_position).toBe(0);
    expect(rows[1]?.booking_group_position).toBe(1);
  });
});
