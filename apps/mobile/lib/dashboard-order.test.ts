import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => secureStore);

import { defaultDashboardOrder } from './dashboard';
import {
  cachedDashboardOrder,
  readDashboardOrder,
  resetDashboardOrder,
  saveDashboardOrder,
} from './dashboard-order';

const storageKey = (userId: string) => `pfotennetz.dashboard-order.v1.${userId}`;

let userId = '';

describe('dashboard order storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The module caches orders per account, so every test uses a fresh one.
    userId = `user-${Math.random().toString(36).slice(2)}`;
  });

  it('returns the default order when nothing is stored', async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(null);
    await expect(readDashboardOrder(userId)).resolves.toEqual([...defaultDashboardOrder]);
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(storageKey(userId));
  });

  it('persists the order per account and serves it from the cache', async () => {
    const order = [...defaultDashboardOrder].reverse();
    await saveDashboardOrder(userId, order);

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      storageKey(userId),
      JSON.stringify(order)
    );
    await expect(readDashboardOrder(userId)).resolves.toEqual(order);
    expect(cachedDashboardOrder(userId)).toEqual(order);
  });

  it('repairs stored data with unknown or missing sections', async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(['requests', 'old-section']));
    const order = await readDashboardOrder(userId);
    expect(order[0]).toBe('requests');
    expect(order).toHaveLength(defaultDashboardOrder.length);
  });

  it('falls back to the default order for corrupt storage', async () => {
    secureStore.getItemAsync.mockResolvedValueOnce('not json');
    await expect(readDashboardOrder(userId)).resolves.toEqual([...defaultDashboardOrder]);
  });

  it('restores the default order', async () => {
    await saveDashboardOrder(userId, [...defaultDashboardOrder].reverse());
    await resetDashboardOrder(userId);

    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      storageKey(userId),
      JSON.stringify([...defaultDashboardOrder])
    );
    expect(cachedDashboardOrder(userId)).toEqual([...defaultDashboardOrder]);
  });

  it('ignores storage errors without crashing', async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error('unavailable'));
    await expect(readDashboardOrder(userId)).resolves.toEqual([...defaultDashboardOrder]);
  });
});
