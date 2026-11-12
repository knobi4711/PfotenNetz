import { useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { resetPassword } from '@pfotennetz/supabase';
import { ActionButton, Card, ErrorBox, appFonts, usePalette } from '../../components/ui';
import { friendlyAuthError } from '../../lib/auth-errors';
import { webBaseUrl } from '../../lib/web-url';

export default function ForgotPasswordScreen() {
  const c = usePalette();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim().includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    const webUrl = webBaseUrl();
    setPending(true);
    try {
      await resetPassword(email.trim(), `${webUrl}/reset-password`);
      setSent(true);
    } catch (cause) {
      setError(friendlyAuthError(cause, 'reset'));
    } finally {
      setPending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <Text
        accessibilityRole="header"
        style={{ color: c.onSurface, fontFamily: appFonts.extrabold, fontSize: 28 }}
      >
        Passwort vergessen?
      </Text>
      <Text
        style={{
          color: c.onSurfaceVariant,
          fontFamily: appFonts.regular,
          marginTop: 8,
          lineHeight: 22,
        }}
      >
        Wir senden dir einen Link zur sicheren Passwortvergabe.
      </Text>
      <Card>
        <Text style={{ color: c.onSurface, fontFamily: appFonts.bold, marginBottom: 6 }}>
          E-Mail
        </Text>
        <TextInput
          accessibilityLabel="E-Mail-Adresse"
          accessibilityHint="Wir senden einen Link zur Passwortvergabe"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="name@beispiel.de"
          placeholderTextColor={c.placeholder}
          value={email}
          onChangeText={setEmail}
          style={{
            backgroundColor: c.surfaceContainerLow,
            borderColor: c.outlineVariant,
            borderWidth: 1,
            borderRadius: 16,
            color: c.onSurface,
            minHeight: 52,
            paddingHorizontal: 14,
          }}
        />
        {sent ? (
          <Text accessibilityRole="alert" style={{ color: c.secondary, marginTop: 12 }}>
            Falls ein Konto existiert, wurde eine E-Mail versendet.
          </Text>
        ) : null}
        {error ? <ErrorBox message={error} /> : null}
        <ActionButton title="Reset-E-Mail senden" pending={pending} onPress={() => void submit()} />
        <ActionButton
          title="Zur Anmeldung"
          variant="secondary"
          onPress={() => router.replace('/(auth)/login')}
        />
      </Card>
    </ScrollView>
  );
}
