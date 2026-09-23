import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSignIn } from '@pfotennetz/supabase';
import { ActionButton, Card, ErrorBox, usePalette } from '../../components/ui';
import {
  friendlyPasskeyError,
  isPasskeySupported,
  signInWithNativePasskey,
} from '../../lib/passkeys';
import {
  friendlyFingerprintError,
  getFingerprintCapabilities,
  hasStoredCredentials,
  signInWithFingerprint,
  storeCredentials,
} from '../../lib/fingerprint-login';

function friendlyAuthError(message: string): string {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'E-Mail oder Passwort ist falsch. Bitte versuche es erneut.';
  }
  return `Anmeldung fehlgeschlagen: ${message}`;
}

export default function LoginScreen() {
  const c = usePalette();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formHint, setFormHint] = useState<string | null>(null);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  // Passkeys stay on iOS/web – Android uses fingerprint sign-in instead.
  const isAndroid = Platform.OS === 'android';
  const passkeySupported = !isAndroid && isPasskeySupported();
  const [fingerprintReady, setFingerprintReady] = useState(false);
  const [fingerprintPending, setFingerprintPending] = useState(false);
  const [fingerprintError, setFingerprintError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAndroid) {
      return;
    }
    let cancelled = false;
    void getFingerprintCapabilities()
      .then(async (capabilities) => {
        if (cancelled || !capabilities.available || !capabilities.enrolled) {
          return;
        }
        if (await hasStoredCredentials()) {
          if (!cancelled) {
            setFingerprintReady(true);
          }
        }
      })
      .catch(() => {
        // Fingerprint stays hidden when hardware checks fail.
      });
    return () => {
      cancelled = true;
    };
  }, [isAndroid]);

  // The session gate in the root layout navigates to the app
  // automatically once the auth state flips to authenticated.
  const maybeOfferFingerprintEnrollment = (signedInEmail: string, signedInPassword: string) => {
    if (!isAndroid) {
      return;
    }
    void getFingerprintCapabilities()
      .then(async (capabilities) => {
        if (!capabilities.available || !capabilities.enrolled) {
          return;
        }
        if (await hasStoredCredentials()) {
          return;
        }
        Alert.alert(
          'Mit Fingerabdruck anmelden?',
          'Künftig kannst du dich auf diesem Gerät mit deinem Fingerabdruck anmelden, ohne dein Passwort einzugeben.',
          [
            { text: 'Später', style: 'cancel' },
            {
              text: 'Aktivieren',
              onPress: () => {
                void storeCredentials(signedInEmail, signedInPassword).catch(() => {
                  // Enrollment stays available after the next password sign-in.
                });
              },
            },
          ]
        );
      })
      .catch(() => {
        // Enrollment stays hidden when hardware checks fail.
      });
  };

  const handleSignIn = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@') || password.length === 0) {
      setFormHint('Bitte gib eine gültige E-Mail-Adresse und dein Passwort ein.');
      return;
    }
    setFormHint(null);
    signIn.mutate(
      { email: trimmedEmail, password },
      {
        onSuccess: () => {
          maybeOfferFingerprintEnrollment(trimmedEmail, password);
        },
      }
    );
  };

  const handlePasskeySignIn = () => {
    setPasskeyPending(true);
    setPasskeyError(null);
    void signInWithNativePasskey()
      .catch((error: unknown) => {
        setPasskeyError(friendlyPasskeyError(error));
      })
      .finally(() => {
        setPasskeyPending(false);
      });
  };

  const handleFingerprintSignIn = () => {
    setFingerprintPending(true);
    setFingerprintError(null);
    void signInWithFingerprint((storedEmail, storedPassword) =>
      signIn.mutateAsync({ email: storedEmail, password: storedPassword })
    )
      .catch((error: unknown) => {
        setFingerprintError(friendlyFingerprintError(error));
      })
      .finally(() => {
        setFingerprintPending(false);
      });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.onSurface }]}>PfotenNetz</Text>
        <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>
          Melde dich an, um deine Buchungen und deine Nachbarschafts-Stunden zu sehen.
        </Text>

        <Card>
          <Text style={[styles.label, { color: c.onSurface }]}>E-Mail</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!signIn.isPending}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@beispiel.de"
            placeholderTextColor={c.outline}
            returnKeyType="next"
            style={[
              styles.input,
              {
                backgroundColor: c.surfaceContainerLow,
                borderColor: c.outlineVariant,
                color: c.onSurface,
              },
            ]}
            value={email}
          />

          <Text style={[styles.label, { color: c.onSurface }]}>Passwort</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!signIn.isPending}
            onChangeText={setPassword}
            onSubmitEditing={handleSignIn}
            placeholder="Passwort"
            placeholderTextColor={c.outline}
            returnKeyType="go"
            secureTextEntry={!showPassword}
            style={[
              styles.input,
              {
                backgroundColor: c.surfaceContainerLow,
                borderColor: c.outlineVariant,
                color: c.onSurface,
              },
            ]}
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            disabled={signIn.isPending}
            onPress={() => {
              setShowPassword((visible) => !visible);
            }}
            style={styles.toggle}
          >
            <Text style={[styles.toggleText, { color: c.primary }]}>
              {showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            </Text>
          </Pressable>

          {formHint !== null ? (
            <Text style={[styles.hint, { color: c.tertiary }]}>{formHint}</Text>
          ) : null}
          {signIn.isError ? <ErrorBox message={friendlyAuthError(signIn.error.message)} /> : null}

          <ActionButton title="Anmelden" pending={signIn.isPending} onPress={handleSignIn} />
        </Card>

        {fingerprintReady ? (
          <Card>
            <Text style={[styles.passkeyTitle, { color: c.onSurface }]}>Ohne Passwort</Text>
            <Text style={[styles.passkeyText, { color: c.onSurfaceVariant }]}>
              Melde dich mit deinem Fingerabdruck an.
            </Text>
            {fingerprintError !== null ? <ErrorBox message={fingerprintError} /> : null}
            <ActionButton
              title="Mit Fingerabdruck anmelden"
              variant="secondary"
              pending={fingerprintPending}
              disabled={signIn.isPending}
              onPress={handleFingerprintSignIn}
            />
          </Card>
        ) : null}

        {passkeySupported ? (
          <Card>
            <Text style={[styles.passkeyTitle, { color: c.onSurface }]}>Ohne Passwort</Text>
            <Text style={[styles.passkeyText, { color: c.onSurfaceVariant }]}>
              Melde dich mit Face ID, Fingerabdruck oder deiner Geräte-PIN an.
            </Text>
            {passkeyError !== null ? <ErrorBox message={passkeyError} /> : null}
            <ActionButton
              title="Mit Passkey anmelden"
              variant="secondary"
              pending={passkeyPending}
              disabled={signIn.isPending}
              onPress={handlePasskeySignIn}
            />
          </Card>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.onSurfaceVariant }]}>Noch kein Konto?</Text>
          <Pressable
            accessibilityRole="link"
            disabled={signIn.isPending}
            onPress={() => router.push('/(auth)/register')}
            style={styles.registerLink}
          >
            <Text style={[styles.toggleText, { color: c.primary }]}>Jetzt registrieren</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', marginTop: 32, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  toggle: { alignSelf: 'flex-start', paddingVertical: 12 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 14, marginTop: 8 },
  footer: { marginTop: 8, alignItems: 'center' },
  footerText: { fontSize: 13, textAlign: 'center' },
  registerLink: { padding: 10 },
  passkeyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  passkeyText: { fontSize: 14, lineHeight: 20 },
});
