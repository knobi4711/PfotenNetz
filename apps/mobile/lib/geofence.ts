import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { getNotificationsModule } from './push';

export const TRACKING_GEOFENCE_TASK = 'pfotennetz-tracking-geofence';
const BOOKING_KEY = 'pfotennetz.active-geofence-booking';

TaskManager.defineTask(TRACKING_GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const event = data as { eventType?: Location.GeofencingEventType } | undefined;
  if (event?.eventType !== Location.GeofencingEventType.Exit) return;
  const notifications = getNotificationsModule();
  if (notifications === null) return;
  const bookingId = await SecureStore.getItemAsync(BOOKING_KEY);
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
}
