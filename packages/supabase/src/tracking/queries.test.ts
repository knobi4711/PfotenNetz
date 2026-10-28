import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchActiveTrackingSessions } from './queries';

interface FilterCall {
  column: string;
  value: unknown;
}

function createTrackingMock(rows: Array<Record<string, unknown>>) {
  const selectCalls: string[] = [];
  const filters: FilterCall[] = [];
  const orders: Array<{ column: string; ascending: boolean }> = [];

  const builder = {
    select: (columns: string) => {
      selectCalls.push(columns);
      return builder;
    },
    is: (column: string, value: unknown) => {
      filters.push({ column, value });
      return builder;
    },
    in: (column: string, value: unknown) => {
      filters.push({ column, value });
      return builder;
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      orders.push({ column, ascending: options?.ascending ?? true });
      return builder;
    },
    then: (onfulfilled: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(onfulfilled),
  };

  const client = {
    from: (table: string) => {
      expect(table).toBe('tracking_sessions');
      return builder;
    },
  } as unknown as SupabaseClient<Database>;

  return { client, selectCalls, filters, orders };
}

describe('fetchActiveTrackingSessions', () => {
  it('only returns sessions whose booking is still running', async () => {
    const mock = createTrackingMock([]);

    await fetchActiveTrackingSessions(mock.client);

    expect(mock.selectCalls[0]).toContain('bookings!inner(status)');
    expect(mock.filters).toContainEqual({ column: 'ended_at', value: null });
    expect(mock.filters).toContainEqual({
      column: 'booking.status',
      value: ['in_progress'],
    });
    expect(mock.orders).toEqual([{ column: 'started_at', ascending: false }]);
  });

  it('strips the embedded booking relation from the returned rows', async () => {
    const session = {
      id: 'session-1',
      booking_id: 'booking-1',
      ended_at: null,
      booking: { status: 'in_progress' },
    };
    const mock = createTrackingMock([session]);

    const result = await fetchActiveTrackingSessions(mock.client);

    expect(result).toEqual([{ id: 'session-1', booking_id: 'booking-1', ended_at: null }]);
  });
});
