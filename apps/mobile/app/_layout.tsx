import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router/stack';
import { router, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth, useRegisterDevice } from '@pfotennetz/supabase';
import { Providers } from '../providers/Providers';
import { ErrorBox, LoadingView, usePalette } from '../components/ui';
import { configureForegroundPresentation, ensurePushRegistration } from '../lib/push';

function usePushSetup(enabled: boolean) {
  const registerDevice = useRegisterDevice();
  const registered = useRef(false);

  useEffect(() => {
    configureForegroundPresentation();
  }, []);

  // Deep link: push payload data.url -> expo-router (nur interne Pfade).
  useEffect(() => {
    const navigate = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.['url'];
      if (typeof url === 'string' && url.startsWith('/')) {
        router.push(url);
      }
    };
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification !== undefined) {
      navigate(lastResponse.notification);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response.notification);
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
  return (
    <Providers>
      <AuthGate />
    </Providers>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
