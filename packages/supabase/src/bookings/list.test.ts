import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchBookingsForUser, filterBookingsByScope, type BookingWithRelations } from './queries';

interface OrderCall {
  column: string;
  ascending: boolean;
}

interface ListChainMock {
  select: (columns: string) => ListChainMock;
  order: (column: string, options?: { ascending?: boolean }) => ListChainMock;
  then: (onfulfilled: (value: { data: unknown; error: null }) => unknown) => Promise<unknown>;
}

function createListMock(rows: Record<string, unknown>[]) {
  const fromTables: string[] = [];
  const orderCalls: OrderCall[] = [];
  const builder: ListChainMock = {
    select: (_columns: string) => builder,
    order: (column: string, options?: { ascending?: boolean }) => {
      orderCalls.push({ column, ascending: options?.ascending ?? true });
      return builder;
    },
    then: (onfulfilled: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve().then(() => onfulfilled({ data: rows, error: null })),
  };
  const client = {
    from: (table: string) => {
      fromTables.push(table);
      return builder;
    },
  };
  return {
    client: client as unknown as SupabaseClient<Database>,
    fromTables,
    orderCalls,
  };
}

describe('fetchBookingsForUser', () => {
  it('loads bookings newest first without client-side user filtering (RLS scopes)', async () => {
    const rows = [
      { id: 'booking-2', booking_number: 'BK-2' },
      { id: 'booking-1', booking_number: 'BK-1' },
    ];
    const { client, fromTables, orderCalls } = createListMock(rows);

    const bookings = await fetchBookingsForUser(client);

    expect(bookings).toEqual(rows);
    expect(fromTables).toEqual(['bookings']);
    expect(orderCalls).toEqual([{ column: 'start_at', ascending: false }]);
  });

  it('resolves to an empty list when there are no bookings', async () => {
    const { client } = createListMock([]);

    await expect(fetchBookingsForUser(client)).resolves.toEqual([]);
  });

  it('archives ended requests regardless of helper assignment', () => {
    const now = Date.parse('2026-10-12T12:00:00.000Z');
    const openWithoutHelper = {
      status: 'requested',
      helper_id: null,
      end_at: '2026-10-12T11:59:59.000Z',
    } as unknown as BookingWithRelations;
    const assignedRequest = {
      status: 'confirmed',
      helper_id: 'helper-1',
      end_at: '2026-10-12T11:59:59.000Z',
    } as unknown as BookingWithRelations;

    expect(filterBookingsByScope([openWithoutHelper], 'archive', now)).toHaveLength(1);
    expect(filterBookingsByScope([openWithoutHelper], 'active', now)).toHaveLength(0);
    expect(filterBookingsByScope([assignedRequest], 'archive', now)).toHaveLength(1);
    expect(filterBookingsByScope([assignedRequest], 'active', now)).toHaveLength(0);
  });

  it('moves completed and cancelled bookings to the archive after three days', () => {
    const now = Date.parse('2026-10-12T12:00:00.000Z');
    const archived = {
      status: 'completed',
      end_at: '2026-10-08T10:00:00.000Z',
      closed_at: '2026-10-08T11:59:59.000Z',
      updated_at: '2026-10-12T11:00:00.000Z',
    } as unknown as BookingWithRelations;
    const recent = {
      status: 'completed',
      end_at: '2026-10-13T12:00:00.000Z',
      closed_at: '2026-10-09T12:00:01.000Z',
      updated_at: '2026-10-12T11:00:00.000Z',
    } as unknown as BookingWithRelations;
    const cancelled = {
      status: 'cancelled',
      end_at: '2026-10-08T10:00:00.000Z',
      closed_at: '2026-10-08T12:00:00.000Z',
      cancelled_at: '2026-10-08T12:00:00.000Z',
      updated_at: '2026-10-12T11:00:00.000Z',
    } as unknown as BookingWithRelations;

    expect(filterBookingsByScope([archived], 'archive', now)).toHaveLength(1);
    expect(filterBookingsByScope([archived], 'active', now)).toHaveLength(0);
    expect(filterBookingsByScope([recent], 'active', now)).toHaveLength(1);
    expect(filterBookingsByScope([cancelled], 'archive', now)).toHaveLength(1);
  });
});
