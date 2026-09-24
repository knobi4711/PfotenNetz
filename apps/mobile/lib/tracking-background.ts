import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { getSupabaseClient } from '@pfotennetz/supabase';

export const TRACKING_LOCATION_TASK = 'pfotennetz-tracking-location';
const TRACKING_SESSION_KEY = 'pfotennetz.active-tracking-session';

TaskManager.defineTask(TRACKING_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const sessionId = await SecureStore.getItemAsync(TRACKING_SESSION_KEY);
  const locations =
    (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (!sessionId || locations.length === 0) return;

  const { error: insertError } = await getSupabaseClient()
    .from('tracking_points')
    .insert(
      locations.map((location) => ({
        session_id: sessionId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy_meters: location.coords.accuracy ?? 0,
        speed_mps: location.coords.speed,
        heading_degrees:
          location.coords.heading === null ? null : Math.round(location.coords.heading),
        altitude_meters: location.coords.altitude,
        recorded_at: new Date(location.timestamp).toISOString(),
        is_batched: locations.length > 1,
      }))
    );
  if (insertError) throw insertError;
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
      notificationColor: '#e26d46',
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
