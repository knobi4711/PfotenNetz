import { getSupabaseClient, insertTrackingPointRows } from '@pfotennetz/supabase';
import type { LocationObject } from 'expo-location';
import { readTrackingQueue, writeTrackingQueue, type QueuedTrackingPoint } from './tracking-queue';

/** Converts a location fix into the row shape used by the queue and the API. */
export function queuedTrackingPoint(
  location: LocationObject,
  sessionId: string,
  isBatched = false
): QueuedTrackingPoint {
  return {
    session_id: sessionId,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy_meters: location.coords.accuracy ?? 0,
    speed_mps: location.coords.speed,
    heading_degrees: location.coords.heading === null ? null : Math.round(location.coords.heading),
    altitude_meters: location.coords.altitude,
    recorded_at: new Date(location.timestamp).toISOString(),
    is_batched: isBatched,
  };
}

/**
 * Uploads the points that could not be delivered earlier (no network, app
 * killed, missing background permission, ...).
 *
 * Points that belong to another session are dropped: once a tracking session
 * has ended, the insert policies reject them, so keeping them would make the
 * queue grow forever.
 */
export async function flushTrackingQueue(sessionId: string): Promise<void> {
  const queued = await readTrackingQueue();
  if (queued.length === 0) return;

  const current = queued.filter((point) => point.session_id === sessionId);
  if (current.length > 0) {
    try {
      await insertTrackingPointRows(getSupabaseClient(), current);
    } catch {
      // Retry on the next flush instead of losing the points.
      await writeTrackingQueue(current);
      return;
    }
  }
  await writeTrackingQueue([]);
}
