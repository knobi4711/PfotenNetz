import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchBookingsForUser } from './queries';

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
});
