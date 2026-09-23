import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchHelperDetail } from './queries';

describe('helper detail', () => {
  it('returns parsed slots from the RPC', async () => {
    const row = {
      helper_id: 'h-1',
      display_name: 'Mara',
      avatar_url: null,
      trust_level: 'gold',
      latitude: 52.52,
      longitude: 13.405,
      distance_km: 1.2,
      rating: 4.5,
      total_walks: 12,
      available_days: [1, 3],
      slots: [
        {
          day_of_week: 1,
          start_time: '09:00',
          end_time: '12:00',
          booking_types: ['walk'],
          max_distance_km: 5,
        },
      ],
    };
    const client = {
      rpc: () => ({ single: () => Promise.resolve({ data: row, error: null }) }),
    } as unknown as SupabaseClient<Database>;
    await expect(fetchHelperDetail(client, 'h-1')).resolves.toMatchObject({
      helper_id: 'h-1',
      rating: 4.5,
      slots: expect.any(Array),
    });
  });

  it('rejects empty helper ids before the RPC', async () => {
    const client = {
      rpc: () => {
        throw new Error('must not call');
      },
    } as unknown as SupabaseClient<Database>;
    await expect(fetchHelperDetail(client, '  ')).rejects.toThrow('Helper-ID fehlt.');
  });
});
