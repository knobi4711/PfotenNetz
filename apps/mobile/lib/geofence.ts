import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { getNotificationsModule } from './push';
import { nextGeofenceState, type GeofenceState } from './geofence-state';

export const TRACKING_GEOFENCE_TASK = 'pfotennetz-tracking-geofence';
const BOOKING_KEY = 'pfotennetz.active-geofence-booking';
const STATE_KEY = 'pfotennetz.active-geofence-state';

TaskManager.defineTask(TRACKING_GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const event = data as { eventType?: Location.GeofencingEventType } | undefined;
  const bookingId = await SecureStore.getItemAsync(BOOKING_KEY);
  if (!bookingId || event?.eventType === undefined) return;
  const eventType =
    event.eventType === Location.GeofencingEventType.Enter
      ? 'enter'
      : event.eventType === Location.GeofencingEventType.Exit
        ? 'exit'
        : null;
  if (eventType === null) return;
  const previousState =
    ((await SecureStore.getItemAsync(STATE_KEY)) as GeofenceState | null) ?? 'inside';
  const transition = nextGeofenceState(previousState, eventType);
  await SecureStore.setItemAsync(STATE_KEY, transition.state);
  if (!transition.shouldNotifyExit) return;
  const notifications = getNotificationsModule();
  if (notifications === null) return;
  await notifications.scheduleNotificationAsync({
    content: {
      title: 'Sicherheitszone verlassen',
      body: 'Die laufende Betreuung hat den vereinbarten Tracking-Radius verlassen.',
      data: { url: bookingId ? `/booking/${bookingId}` : '/tracking' },
      categoryIdentifier: 'booking',
    },
    trigger: null,
  });
});

export async function startTrackingGeofence(
  bookingId: string,
  center: { latitude: number; longitude: number },
  radius = 500
): Promise<void> {
  const permission = await Location.requestBackgroundPermissionsAsync();
  if (!permission.granted)
    throw new Error('Hintergrundstandort wird für die Sicherheitszone benötigt.');
  await SecureStore.setItemAsync(BOOKING_KEY, bookingId);
  await SecureStore.setItemAsync(STATE_KEY, 'inside');
  await Location.startGeofencingAsync(TRACKING_GEOFENCE_TASK, [
    {
      identifier: `booking-${bookingId}`,
      latitude: center.latitude,
      longitude: center.longitude,
      radius,
      notifyOnEnter: false,
      notifyOnExit: true,
    },
  ]);
}

export async function stopTrackingGeofence(): Promise<void> {
  if (await Location.hasStartedGeofencingAsync(TRACKING_GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(TRACKING_GEOFENCE_TASK);
  }
  await SecureStore.deleteItemAsync(BOOKING_KEY);
  await SecureStore.deleteItemAsync(STATE_KEY);
}
