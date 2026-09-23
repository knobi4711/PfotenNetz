import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import {
  fetchOwnNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationDeepLink,
  subscribeNotifications,
} from './queries';

const USER_ID = 'user-1';

function clientWith(stubs: {
  selectResult?: unknown;
  updateResult?: unknown;
  countResult?: unknown;
}) {
  const calls: unknown[] = [];
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  chain['select'] = (...args: unknown[]) => {
    calls.push({ op: 'select', args });
    return chainProxy();
  };
  chain['eq'] = (...args: unknown[]) => {
    calls.push({ op: 'eq', args });
    return chainProxy();
  };
  chain['order'] = (...args: unknown[]) => {
    calls.push({ op: 'order', args });
    return chainProxy();
  };
  chain['limit'] = (...args: unknown[]) => {
    calls.push({ op: 'limit', args });
    return Promise.resolve(stubs.selectResult ?? { data: [], error: null });
  };
  chain['is'] = (...args: unknown[]) => {
    calls.push({ op: 'is', args });
    if (calls.some((c) => (c as { op: string }).op === 'update')) {
      return Promise.resolve(stubs.updateResult ?? { data: null, error: null });
    }
    return Promise.resolve(
      stubs.countResult ?? stubs.selectResult ?? { data: [], error: null, count: 0 }
    );
  };
  chain['update'] = (...args: unknown[]) => {
    calls.push({ op: 'update', args });
    return chainProxy();
  };
  function chainProxy() {
    return new Proxy(chain, {
      get: (target, prop: string) => {
        if (prop in target) return target[prop];
        throw new Error(`unexpected chain op: ${prop}`);
      },
    });
  }
  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: USER_ID } } }) },
    from: (table: string) => {
      calls.push({ op: 'from', table });
      return chainProxy();
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(() => Promise.resolve()),
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe('notifications', () => {
  it('lists own notifications newest first with limit', async () => {
    const rows = [{ id: 'n-1' }];
    const { client, calls } = clientWith({ selectResult: { data: rows, error: null } });
    await expect(fetchOwnNotifications(client, 10)).resolves.toEqual(rows);
    expect(calls).toContainEqual({ op: 'from', table: 'notifications' });
    expect(calls).toContainEqual({ op: 'limit', args: [10] });
  });

  it('counts unread notifications', async () => {
    const { client } = clientWith({ countResult: { data: null, error: null, count: 3 } });
    await expect(fetchUnreadCount(client)).resolves.toBe(3);
  });

  it('marks one and all notifications as read (own rows only)', async () => {
    const { client, calls } = clientWith({});
    await markNotificationRead(client, 'n-1');
    expect(calls).toContainEqual({ op: 'eq', args: ['id', 'n-1'] });
    const second = clientWith({});
    await markAllNotificationsRead(second.client);
    expect(second.calls).toContainEqual({ op: 'eq', args: ['user_id', USER_ID] });
  });

  it('extracts deep links only for internal paths', () => {
    expect(notificationDeepLink({ data: { url: '/booking/abc' } })).toBe('/booking/abc');
    expect(notificationDeepLink({ data: { url: 'https://evil.example' } })).toBeNull();
    expect(notificationDeepLink({ data: {} })).toBeNull();
    expect(notificationDeepLink({ data: [] })).toBeNull();
  });

  it('subscribes with user-scoped filter and unsubscribes', () => {
    const onCalls: unknown[] = [];
    const channels: { filter: unknown }[] = [];
    const client = {
      channel: (name: string) => {
        onCalls.push(name);
        return {
          on: (_event: string, filter: unknown, _cb: () => void) => {
            channels.push({ filter });
            return { subscribe: () => ({}) };
          },
        };
      },
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<Database>;
    const unsubscribe = subscribeNotifications(client, USER_ID, () => {});
    expect(onCalls).toEqual([`notifications:${USER_ID}`]);
    expect(channels[0]?.filter).toMatchObject({ table: 'notifications' });
    unsubscribe();
    expect(client.removeChannel).toHaveBeenCalled();
  });
});
