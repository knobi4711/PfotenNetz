import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { fetchOwnTimebankAccount, fetchOwnTimebankTransactions } from './queries';

interface EqCall {
  column: string;
  value: unknown;
}

interface OrderCall {
  column: string;
  ascending: boolean;
}

interface ChainMock {
  select: (columns: string) => ChainMock;
  eq: (column: string, value: unknown) => ChainMock;
  order: (column: string, options?: { ascending?: boolean }) => ChainMock;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: (onfulfilled: (value: { data: unknown; error: null }) => unknown) => Promise<unknown>;
}

interface TimebankMock {
  client: SupabaseClient<Database>;
  fromTables: string[];
  eqCalls: EqCall[];
  orderCalls: OrderCall[];
  rpcCalls: string[];
}

function createTimebankMock(options: {
  userId: string | null;
  account: Record<string, unknown> | null;
  transactions: Record<string, unknown>[];
}): TimebankMock {
  const fromTables: string[] = [];
  const eqCalls: EqCall[] = [];
  const orderCalls: OrderCall[] = [];
  const rpcCalls: string[] = [];

  const builder: ChainMock = {
    select: (_columns: string) => builder,
    eq: (column: string, value: unknown) => {
      eqCalls.push({ column, value });
      return builder;
    },
    order: (column: string, orderOptions?: { ascending?: boolean }) => {
      orderCalls.push({ column, ascending: orderOptions?.ascending ?? true });
      return builder;
    },
    maybeSingle: () => {
      if (fromTables[fromTables.length - 1] === 'timebank_transactions') {
        return Promise.resolve({ data: options.transactions, error: null });
      }
      return Promise.resolve({ data: options.account, error: null });
    },
    then: (onfulfilled: (value: { data: unknown; error: null }) => unknown) => {
      const lastTable = fromTables[fromTables.length - 1];
      const data = lastTable === 'timebank_transactions' ? options.transactions : options.account;
      return Promise.resolve().then(() => onfulfilled({ data, error: null }));
    },
  };

  const client = {
    from: (table: string) => {
      fromTables.push(table);
      return builder;
    },
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: options.userId === null ? null : { id: options.userId } },
          error: null,
        }),
    },
    rpc: (fn: string): never => {
      rpcCalls.push(fn);
      throw new Error(`rpc(${fn}) must not be used by timebank queries`);
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    fromTables,
    eqCalls,
    orderCalls,
    rpcCalls,
  };
}

const ACCOUNT_ROW = {
  user_id: 'user-1',
  balance_hours: 2,
  total_earned_hours: 2,
  total_spent_hours: 0,
};

describe('fetchOwnTimebankAccount', () => {
  it('returns the own account scoped by the authenticated user', async () => {
    const { client, fromTables, eqCalls } = createTimebankMock({
      userId: 'user-1',
      account: ACCOUNT_ROW,
      transactions: [],
    });

    const account = await fetchOwnTimebankAccount(client);

    expect(account).toEqual(ACCOUNT_ROW);
    expect(fromTables).toEqual(['timebank_accounts']);
    expect(eqCalls).toEqual([{ column: 'user_id', value: 'user-1' }]);
  });

  it('resolves to null instead of throwing when no account exists yet', async () => {
    const { client } = createTimebankMock({ userId: 'user-1', account: null, transactions: [] });

    await expect(fetchOwnTimebankAccount(client)).resolves.toBeNull();
  });

  it('throws when not authenticated', async () => {
    const { client } = createTimebankMock({ userId: null, account: null, transactions: [] });

    await expect(fetchOwnTimebankAccount(client)).rejects.toThrow('Not authenticated');
  });
});

describe('fetchOwnTimebankTransactions', () => {
  it('loads only the own transactions newest first', async () => {
    const rows = [
      { id: 'tx-2', user_id: 'user-1', created_at: '2026-09-21T10:00:00Z' },
      { id: 'tx-1', user_id: 'user-1', created_at: '2026-09-20T10:00:00Z' },
    ];
    const { client, fromTables, eqCalls, orderCalls, rpcCalls } = createTimebankMock({
      userId: 'user-1',
      account: null,
      transactions: rows,
    });

    const transactions = await fetchOwnTimebankTransactions(client);

    expect(transactions).toEqual(rows);
    expect(fromTables).toEqual(['timebank_transactions']);
    expect(eqCalls).toEqual([{ column: 'user_id', value: 'user-1' }]);
    expect(orderCalls).toEqual([{ column: 'created_at', ascending: false }]);
    expect(rpcCalls).toEqual([]);
  });

  it('returns an empty list when there are no transactions', async () => {
    const { client } = createTimebankMock({ userId: 'user-1', account: null, transactions: [] });

    await expect(fetchOwnTimebankTransactions(client)).resolves.toEqual([]);
  });
});
