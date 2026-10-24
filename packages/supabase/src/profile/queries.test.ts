import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchOwnProfile, updateOwnProfile, validateUpdateOwnProfile } from './queries';

function clientWithStubs(stubs: {
  userId: string | null;
  queryResult: unknown;
  updateResult: unknown;
}) {
  const calls: { table: string; values?: unknown }[] = [];
  const builder = (table: string) => {
    calls.push({ table });
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(stubs.queryResult),
          single: () => Promise.resolve(stubs.updateResult),
        }),
      }),
      update: (values: unknown) => {
        calls.push({ table, values });
        return {
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve(stubs.updateResult),
            }),
          }),
        };
      },
    };
  };
  const client = {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: stubs.userId === null ? null : { id: stubs.userId } } }),
    },
    from: (table: string) => builder(table),
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ table: `rpc:${fn}`, values: args });
      return Promise.resolve({ error: null });
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe('profile queries', () => {
  it('fetches the caller profile by authenticated user id', async () => {
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      queryResult: { data: { id: 'user-1' }, error: null },
      updateResult: { data: null, error: null },
    });

    const result = await fetchOwnProfile(client);

    expect(result).toEqual({ id: 'user-1', private_address: null });
    expect(calls.filter((call) => call.table === 'profiles').length).toBeGreaterThan(0);
  });

  it('rejects profile reads without a session', async () => {
    const { client } = clientWithStubs({
      userId: null,
      queryResult: { data: null, error: null },
      updateResult: { data: null, error: null },
    });

    await expect(fetchOwnProfile(client)).rejects.toThrow('Not authenticated');
  });

  it('updates only the editable profile fields', async () => {
    const updated = { id: 'user-1', display_name: 'Anna' };
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      queryResult: { data: null, error: null },
      updateResult: { data: updated, error: null },
    });

    const result = await updateOwnProfile(client, {
      displayName: 'Anna',
      phone: null,
      postalCode: '10115',
      privateAddress: 'Musterstraße 1, 10115 Berlin',
      kiezRadiusKm: 1.5,
    });

    expect(result).toEqual(updated);
    const updateCall = calls.find((call) => call.values !== undefined);
    expect(updateCall?.values).toEqual({
      display_name: 'Anna',
      phone: null,
      postal_code: '10115',
      kiez_radius_km: 1.5,
    });
  });

  it('saves the exact home address through its private server RPC', async () => {
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      queryResult: { data: null, error: null },
      updateResult: { data: { id: 'user-1' }, error: null },
    });
    await updateOwnProfile(client, {
      displayName: 'Anna',
      phone: null,
      postalCode: '10115',
      privateAddress: 'Musterstraße 1, 10115 Berlin',
      kiezRadiusKm: 1.5,
    });
    expect(calls.find((call) => call.table === 'rpc:save_own_private_address')?.values).toEqual({
      p_address: 'Musterstraße 1, 10115 Berlin',
      p_postal_code: '10115',
    });
  });

  it('validates the display name before updating', async () => {
    expect(
      validateUpdateOwnProfile({
        displayName: 'A',
        phone: null,
        postalCode: '10115',
        privateAddress: 'Musterstraße 1, 10115 Berlin',
        kiezRadiusKm: 1.5,
      })
    ).not.toBeNull();
    expect(
      validateUpdateOwnProfile({
        displayName: 'Anna',
        phone: null,
        postalCode: '10115',
        privateAddress: 'Musterstraße 1, 10115 Berlin',
        kiezRadiusKm: 1.5,
      })
    ).toBeNull();
  });

  it('requires a five-digit postal code', () => {
    expect(
      validateUpdateOwnProfile({
        displayName: 'Anna',
        phone: null,
        postalCode: '',
        privateAddress: 'Musterstraße 1, 10115 Berlin',
        kiezRadiusKm: 1.5,
      })
    ).toBe('Bitte gib eine gültige fünfstellige Postleitzahl ein.');
    expect(
      validateUpdateOwnProfile({
        displayName: 'Anna',
        phone: null,
        postalCode: '10115',
        privateAddress: 'Musterstraße 1, 10115 Berlin',
        kiezRadiusKm: 1.5,
      })
    ).toBeNull();
  });

  it('requires a private street address', () => {
    expect(
      validateUpdateOwnProfile({
        displayName: 'Anna',
        phone: null,
        postalCode: '10115',
        privateAddress: '',
        kiezRadiusKm: 1.5,
      })
    ).toBe('Bitte gib eine vollständige Adresse mit 5 bis 300 Zeichen ein.');
  });

  it('stores notification preferences without allowing server-managed fields', async () => {
    const { client, calls } = clientWithStubs({
      userId: 'user-1',
      queryResult: { data: null, error: null },
      updateResult: { data: { id: 'user-1' }, error: null },
    });

    await updateOwnProfile(client, {
      displayName: 'Anna',
      phone: null,
      postalCode: '10115',
      privateAddress: 'Musterstraße 1, 10115 Berlin',
      kiezRadiusKm: 1.5,
      notificationPrefs: { hazards: true, bookings: false, community: true },
    });

    const updateCall = calls.find((call) => call.values !== undefined);
    expect(updateCall?.values).toEqual({
      display_name: 'Anna',
      phone: null,
      postal_code: '10115',
      kiez_radius_km: 1.5,
      notification_prefs: { hazards: true, bookings: false, community: true },
    });
  });
});
