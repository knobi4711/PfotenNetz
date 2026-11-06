import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchNearbyHelperCount, fetchRegisteredUserCount } from './queries';

function clientWithRpc(result: unknown) {
  const calls: string[] = [];
  const client = {
    rpc: (name: string) => {
      calls.push(name);
      return Promise.resolve(result);
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe('fetchRegisteredUserCount', () => {
  it('reads the aggregate through the security-definer function', async () => {
    const { client, calls } = clientWithRpc({ data: 12, error: null });

    await expect(fetchRegisteredUserCount(client)).resolves.toBe(12);
    expect(calls).toEqual(['registered_user_count']);
  });

  it('coerces bigint values that arrive as strings', async () => {
    const { client } = clientWithRpc({ data: '42', error: null });

    await expect(fetchRegisteredUserCount(client)).resolves.toBe(42);
  });

  it('falls back to zero when the function returns null', async () => {
    const { client } = clientWithRpc({ data: null, error: null });

    await expect(fetchRegisteredUserCount(client)).resolves.toBe(0);
  });

  it('forwards RPC errors', async () => {
    const error = new Error('permission denied');
    const { client } = clientWithRpc({ data: null, error });

    await expect(fetchRegisteredUserCount(client)).rejects.toBe(error);
  });
});

describe('fetchNearbyHelperCount', () => {
  it('reads the aggregate through the security-definer function', async () => {
    const { client, calls } = clientWithRpc({ data: 7, error: null });

    await expect(fetchNearbyHelperCount(client)).resolves.toBe(7);
    expect(calls).toEqual(['nearby_helper_count']);
  });

  it('coerces bigint values that arrive as strings', async () => {
    const { client } = clientWithRpc({ data: '3', error: null });

    await expect(fetchNearbyHelperCount(client)).resolves.toBe(3);
  });

  it('keeps null to signal a missing profile location', async () => {
    const { client } = clientWithRpc({ data: null, error: null });

    await expect(fetchNearbyHelperCount(client)).resolves.toBeNull();
  });

  it('forwards RPC errors', async () => {
    const error = new Error('permission denied');
    const { client } = clientWithRpc({ data: null, error });

    await expect(fetchNearbyHelperCount(client)).rejects.toBe(error);
  });
});
