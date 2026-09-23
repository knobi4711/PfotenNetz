import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { DevicePlatform } from '@pfotennetz/supabase';

export interface PushRegistration {
  platform: DevicePlatform;
  pushToken: string;
  deviceName: string | null;
  appVersion: string | null;
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
 * Returns null when push is unavailable (web, simulator without support,
 * denied permission) — the caller treats that as "no push", never an error
 * that blocks the app.
 */
export async function ensurePushRegistration(): Promise<PushRegistration | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Allgemein',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existingStatus === 'granted'
      ? existingStatus
      : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return null;

  try {
    const projectId = expoProjectId();
    const token =
      projectId !== null
        ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
        : (await Notifications.getDevicePushTokenAsync()).data;
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

/** Foreground presentation: banner + list, no sound, no badge. */
export function configureForegroundPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
