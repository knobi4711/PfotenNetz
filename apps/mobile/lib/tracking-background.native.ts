import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { readTrackingQueue, writeTrackingQueue } from './tracking-queue';
import { flushTrackingQueue, queuedTrackingPoint } from './tracking-upload';

export const TRACKING_LOCATION_TASK = 'pfotennetz-tracking-location';
const TRACKING_SESSION_KEY = 'pfotennetz.active-tracking-session';

TaskManager.defineTask(TRACKING_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const sessionId = await SecureStore.getItemAsync(TRACKING_SESSION_KEY);
  const locations =
    (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (!sessionId || locations.length === 0) return;

  const points = locations.map((location) =>
    queuedTrackingPoint(location, sessionId, locations.length > 1)
  );
  const queued = await readTrackingQueue();
  await writeTrackingQueue([...queued, ...points]);
  await flushTrackingQueue(sessionId);
});

export async function startBackgroundTracking(sessionId: string): Promise<void> {
  const permission = await Location.requestBackgroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Hintergrundstandort wird für Live-Tracking benötigt.');
  }

  if (await Location.hasStartedLocationUpdatesAsync(TRACKING_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(TRACKING_LOCATION_TASK);
  }
  await SecureStore.setItemAsync(TRACKING_SESSION_KEY, sessionId);
  await Location.startLocationUpdatesAsync(TRACKING_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 10,
    timeInterval: 10_000,
    deferredUpdatesDistance: 25,
    deferredUpdatesInterval: 30_000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'PfotenNetz Live-Tracking',
      notificationBody: 'Die aktive Betreuung wird sicher begleitet.',
      notificationColor: '#b34a28',
      killServiceOnDestroy: false,
    },
  });
}

export async function stopBackgroundTracking(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(TRACKING_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(TRACKING_LOCATION_TASK);
  }
  await SecureStore.deleteItemAsync(TRACKING_SESSION_KEY);
}
