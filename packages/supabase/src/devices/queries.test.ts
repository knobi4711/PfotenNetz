import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { registerDevice, validateRegisterDevice } from './queries';

describe('device registration', () => {
  it('rejects empty or oversized tokens before any query', () => {
    expect(validateRegisterDevice({ platform: 'android', pushToken: '  ' })).not.toBeNull();
    expect(validateRegisterDevice({ platform: 'ios', pushToken: 'x'.repeat(513) })).not.toBeNull();
    expect(
      validateRegisterDevice({ platform: 'ios', pushToken: 'ExponentPushToken[abc]' })
    ).toBeNull();
  });

  it('upserts on push_token for the caller', async () => {
    const upserts: unknown[] = [];
    const device = { id: 'd-1', push_token: 'tok' };
    const client = {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
      from: () => ({
        upsert: (values: unknown, options: unknown) => {
          upserts.push({ values, options });
          return {
            select: () => ({ single: () => Promise.resolve({ data: device, error: null }) }),
          };
        },
      }),
    } as unknown as SupabaseClient<Database>;

    await expect(
      registerDevice(client, { platform: 'android', pushToken: 'tok' })
    ).resolves.toEqual(device);
    expect(upserts).toHaveLength(1);
    const first = upserts[0] as {
      values: Record<string, unknown>;
      options: Record<string, unknown>;
    };
    expect(first.options).toMatchObject({ onConflict: 'push_token' });
    expect(first.values['user_id']).toBe('user-1');
    expect(first.values['is_active']).toBe(true);
  });
});
