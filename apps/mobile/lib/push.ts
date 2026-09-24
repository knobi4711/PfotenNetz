import { Platform } from 'react-native';
import * as Device from 'expo-device';
import type * as NotificationsType from 'expo-notifications';
import Constants from 'expo-constants';
import type { DevicePlatform } from '@pfotennetz/supabase';
export { notificationActionUrl, type NotificationActionData } from './push-actions';
export interface PushRegistration {
  platform: DevicePlatform;
  pushToken: string;
  deviceName: string | null;
  appVersion: string | null;
}

/**
 * expo-notifications ist seit SDK 53 nicht mehr in Expo Go enthalten
 * (Remote-Push wurde entfernt). Das Modul wird daher erst zur Laufzeit
 * geladen — in Expo Go schlägt das fehl und Push ist deaktiviert, statt
 * die ganze App abstürzen zu lassen. In Dev-Builds/Production funktioniert
 * alles wie bisher.
 */
let cachedNotifications: typeof NotificationsType | null | undefined;

export function getNotificationsModule(): typeof NotificationsType | null {
  // Expo Go (appOwnership === 'expo'): Remote-Push ist seit SDK 53 entfernt.
  // Das JS-Modul lädt zwar, aber jeder native Zugriff wirft — daher das
  // Modul hier gar nicht erst anfassen.
  if (Constants.appOwnership === 'expo') return null;
  if (cachedNotifications !== undefined) return cachedNotifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNotifications = require('expo-notifications') as typeof NotificationsType;
  } catch {
    cachedNotifications = null;
  }
  return cachedNotifications;
}

export function isPushAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  return getNotificationsModule() !== null;
}

/** Registers a callback for native/Expo token rotation in a development or production build. */
export function subscribeToPushTokenChanges(onToken: (token: string) => void): () => void {
  const notifications = getNotificationsModule();
  if (notifications === null || Platform.OS === 'web') return () => undefined;
  const subscription = notifications.addPushTokenListener((event) => {
    if (typeof event.data === 'string' && event.data.length > 0) onToken(event.data);
  });
  return () => subscription.remove();
}

function currentPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function expoProjectId(): string | null {
  const id = Constants.expoConfig?.extra?.['eas']?.['projectId'] ?? Constants.easConfig?.projectId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Registers the device for push notifications and returns a token for backend
 * storage (devices.push_token). Prefers the Expo push token when an EAS
 * projectId is configured (server can deliver via Expo Push API); otherwise
 * falls back to the native FCM/APNs device token (delivery then needs
 * FCM/APNs credentials on the server).
 * Returns null when push is unavailable (Expo Go, web, simulator without
 * support, denied permission) — the caller treats that as "no push", never
 * an error that blocks the app.
 */
export async function ensurePushRegistration(): Promise<PushRegistration | null> {
  const notifications = getNotificationsModule();
  if (notifications === null) return null;
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('default', {
      name: 'Allgemein',
      importance: notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await notifications.getPermissionsAsync();
  const finalStatus =
    existingStatus === 'granted'
      ? existingStatus
      : (await notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return null;

  try {
    const projectId = expoProjectId();
    const token =
      projectId !== null
        ? (await notifications.getExpoPushTokenAsync({ projectId })).data
        : (await notifications.getDevicePushTokenAsync()).data;
    if (typeof token !== 'string' || token.length === 0) return null;
    return {
      platform: currentPlatform(),
      pushToken: token,
      deviceName: Device.deviceName ?? null,
      appVersion: Constants.expoConfig?.version ?? null,
    };
  } catch {
    return null;
  }
}

/** Foreground presentation: banner + list, no sound, no badge. No-op ohne Push. */
export function configureForegroundPresentation(): void {
  const notifications = getNotificationsModule();
  if (notifications === null) return;
  void Promise.all([
    notifications.setNotificationCategoryAsync('booking', [
      {
        identifier: 'OPEN_BOOKING',
        buttonTitle: 'Buchung öffnen',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'OPEN_CHAT',
        buttonTitle: 'Chat öffnen',
        options: { opensAppToForeground: true },
      },
    ]),
    notifications.setNotificationCategoryAsync('community', [
      {
        identifier: 'OPEN_EVENT',
        buttonTitle: 'Event öffnen',
        options: { opensAppToForeground: true },
      },
    ]),
    notifications.setNotificationCategoryAsync('safety', [
      {
        identifier: 'OPEN_ALERT',
        buttonTitle: 'Warnung öffnen',
        options: { opensAppToForeground: true },
      },
    ]),
  ]).catch(() => undefined);
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
