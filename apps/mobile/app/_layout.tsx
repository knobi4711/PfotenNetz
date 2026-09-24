import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router/stack';
import { router, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import type * as Notifications from 'expo-notifications';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import { useAuth, useRegisterDevice } from '@pfotennetz/supabase';
import { Providers } from '../providers/Providers';
import '../lib/geofence';
import '../lib/tracking-background';
import { ErrorBox, LoadingView, usePalette } from '../components/ui';
import {
  configureForegroundPresentation,
  ensurePushRegistration,
  getNotificationsModule,
  notificationActionUrl,
  subscribeToPushTokenChanges,
} from '../lib/push';

function usePushSetup(enabled: boolean) {
  const registerDevice = useRegisterDevice();
  const registered = useRef(false);

  useEffect(() => {
    configureForegroundPresentation();
  }, []);

  // Deep link: push payload data.url -> expo-router (nur interne Pfade).
  // Ohne Push-Modul (Expo Go) ist dieser Effekt ein No-op.
  useEffect(() => {
    const notifications = getNotificationsModule();
    if (notifications === null) return;
    const navigate = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const url = notificationActionUrl(
        typeof data === 'object' && data !== null ? data : {},
        response.actionIdentifier,
        notifications.DEFAULT_ACTION_IDENTIFIER
      );
      if (url !== null) {
        router.push(url);
      }
    };
    const lastResponse = notifications.getLastNotificationResponse();
    if (lastResponse !== null && lastResponse !== undefined) {
      navigate(lastResponse);
      void notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }
    const subscription = notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!enabled || registered.current || registerDevice.isPending) return;
    registered.current = true;
    void (async () => {
      try {
        const registration = await ensurePushRegistration();
        if (registration !== null) {
          await registerDevice.mutateAsync({
            platform: registration.platform,
            pushToken: registration.pushToken,
            deviceName: registration.deviceName ?? undefined,
            appVersion: registration.appVersion ?? undefined,
          });
        }
      } catch {
        registered.current = false;
      }
    })();
  }, [enabled, registerDevice]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeToPushTokenChanges((pushToken) => {
      void (async () => {
        const registration = await ensurePushRegistration();
        if (registration === null) return;
        await registerDevice.mutateAsync({
          platform: registration?.platform ?? 'web',
          pushToken,
          deviceName: registration?.deviceName ?? undefined,
          appVersion: registration?.appVersion ?? undefined,
        });
      })().catch(() => undefined);
    });
  }, [enabled, registerDevice]);
}

function AuthGate() {
  const auth = useAuth();
  const segments = useSegments();
  const atRoot = segments.length === 0 || segments[0] === 'index';
  const inAuthGroup = segments[0] === '(auth)';

  const redirectToHome = auth.status === 'authenticated' && (atRoot || inAuthGroup);
  const redirectToLogin = auth.status === 'unauthenticated' && !inAuthGroup;

  usePushSetup(auth.status === 'authenticated');

  useEffect(() => {
    if (redirectToHome) {
      router.replace('/(tabs)/home');
    } else if (redirectToLogin) {
      router.replace('/(auth)/login');
    }
  }, [redirectToHome, redirectToLogin]);

  const c = usePalette();

  if (auth.status === 'loading') {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: c.surface }]}>
        <LoadingView label="Sitzung wird geprüft …" />
      </SafeAreaView>
    );
  }

  if (auth.status === 'error') {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: c.surface }]}>
        <ErrorBox
          message={`Authentifizierung fehlgeschlagen: ${auth.error?.message ?? 'Unbekannter Fehler'}`}
        />
      </SafeAreaView>
    );
  }

  if (redirectToHome || redirectToLogin) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: c.surface }]}>
        <LoadingView label="Weiterleitung …" />
      </SafeAreaView>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="booking/new" options={{ title: 'Neue Anfrage' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Buchung' }} />
      <Stack.Screen name="helper/[id]" options={{ title: 'Helper-Profil' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded && fontError === null) {
    return null;
  }

  return (
    <Providers>
      <AuthGate />
    </Providers>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
