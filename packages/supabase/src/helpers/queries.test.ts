import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchNearbyHelpers, validateNearbyHelperSearch } from './queries';

function clientWithRpc(result: unknown) {
  const calls: unknown[] = [];
  const client = {
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return Promise.resolve(result);
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe('nearby helper search', () => {
  it('calls the privacy-preserving RPC with validated coordinates', async () => {
    const helpers = [{ helper_id: 'helper-1', distance_km: 1.2 }];
    const { client, calls } = clientWithRpc({ data: helpers, error: null });

    await expect(
      fetchNearbyHelpers(client, { latitude: 52.52, longitude: 13.405, radiusKm: 3 })
    ).resolves.toEqual(helpers);
    expect(calls).toEqual([
      {
        name: 'find_nearby_helpers',
        args: {
          p_latitude: 52.52,
          p_longitude: 13.405,
          p_radius_km: 3,
          p_limit: 20,
        },
      },
    ]);
  });

  it('forwards RPC errors', async () => {
    const error = new Error('Authentication required');
    const { client } = clientWithRpc({ data: null, error });
    await expect(
      fetchNearbyHelpers(client, { latitude: 52.52, longitude: 13.405, radiusKm: 3 })
    ).rejects.toBe(error);
  });

  it('rejects invalid radius and coordinates before the RPC', () => {
    expect(validateNearbyHelperSearch({ latitude: 91, longitude: 13, radiusKm: 3 })).not.toBeNull();
    expect(
      validateNearbyHelperSearch({ latitude: 52, longitude: 181, radiusKm: 3 })
    ).not.toBeNull();
    expect(
      validateNearbyHelperSearch({ latitude: 52, longitude: 13, radiusKm: 0.1 })
    ).not.toBeNull();
    expect(validateNearbyHelperSearch({ latitude: 52, longitude: 13, radiusKm: 3 })).toBeNull();
  });
});
