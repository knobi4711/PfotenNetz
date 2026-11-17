import * as SecureStore from 'expo-secure-store';
import {
  defaultDashboardOrder,
  normalizeDashboardOrder,
  type DashboardSectionId,
} from './dashboard';

/**
 * The dashboard order is a personal preference, so it is stored per account:
 * a shared device keeps the layout of every person separate.
 *
 * Native keys live in expo-secure-store, the web build uses localStorage.
 * Only section ids are stored — never the dashboard data itself.
 */
const storageKey = (userId: string) => `pfotennetz.dashboard-order.v1.${userId}`;

/** Avoids a flash of the default layout when the screen remounts. */
const cache = new Map<string, DashboardSectionId[]>();
const loading = new Map<string, Promise<DashboardSectionId[]>>();
const writes = new Map<string, Promise<void>>();

function defaultOrder(): DashboardSectionId[] {
  return [...defaultDashboardOrder];
}

function webStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

async function readValue(key: string): Promise<string | null> {
  const storage = webStorage();
  if (storage !== null) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  const storage = webStorage();
  if (storage !== null) {
    try {
      storage.setItem(key, value);
    } catch {
      // Storage can be blocked (private mode); the in-memory cache still applies.
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // The in-memory cache keeps the order until the app restarts.
  }
}

function parseOrder(raw: string | null): DashboardSectionId[] {
  if (raw === null) return defaultOrder();
  try {
    return normalizeDashboardOrder(JSON.parse(raw));
  } catch {
    return defaultOrder();
  }
}

/** The order known for this account, without waiting for storage. */
export function cachedDashboardOrder(userId: string | null | undefined): DashboardSectionId[] {
  if (userId === null || userId === undefined || userId.length === 0) return defaultOrder();
  const cached = cache.get(userId);
  return cached === undefined ? defaultOrder() : [...cached];
}

/** Reads the stored order of an account, falling back to the default layout. */
export function readDashboardOrder(userId: string): Promise<DashboardSectionId[]> {
  const cached = cache.get(userId);
  if (cached !== undefined) return Promise.resolve([...cached]);
  const inFlight = loading.get(userId);
  if (inFlight !== undefined) return inFlight;

  const promise = (async (): Promise<DashboardSectionId[]> => {
    const order = parseOrder(await readValue(storageKey(userId)));
    cache.set(userId, order);
    loading.delete(userId);
    return [...order];
  })();
  loading.set(userId, promise);
  return promise;
}

/**
 * Stores the order and keeps the cache up to date. Writes are serialized per
 * account so a rapid drag sequence cannot be persisted out of order.
 */
export function saveDashboardOrder(
  userId: string,
  order: readonly DashboardSectionId[]
): Promise<void> {
  const next = normalizeDashboardOrder(order);
  cache.set(userId, next);
  const previous = writes.get(userId) ?? Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(() => writeValue(storageKey(userId), JSON.stringify(next)));
  writes.set(userId, write);
  return write;
}

/** Restores the default layout (order the dashboard always used). */
export function resetDashboardOrder(userId: string): Promise<void> {
  return saveDashboardOrder(userId, defaultDashboardOrder);
}
