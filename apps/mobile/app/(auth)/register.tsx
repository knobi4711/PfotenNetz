import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp } from '@pfotennetz/supabase';
import { ActionButton, Card, ErrorBox, appFonts, usePalette } from '../../components/ui';

function friendlySignUpError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'Für diese E-Mail-Adresse besteht bereits ein Konto.';
  }
  if (normalized.includes('password')) {
    return 'Das Passwort erfüllt die Sicherheitsanforderungen noch nicht.';
  }
  return `Registrierung fehlgeschlagen: ${message}`;
}

export default function RegisterScreen() {
  const c = usePalette();
  const signUp = useSignUp();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [formHint, setFormHint] = useState<string | null>(null);

  const handleSignUp = () => {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) {
      setFormHint('Bitte gib einen Namen mit mindestens zwei Zeichen ein.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setFormHint('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    if (password.length < 8) {
      setFormHint('Das Passwort muss mindestens acht Zeichen lang sein.');
      return;
    }
    if (password !== passwordConfirmation) {
      setFormHint('Die Passwörter stimmen nicht überein.');
      return;
    }

    setFormHint(null);
    signUp.mutate({ displayName: trimmedName, email: trimmedEmail, password });
  };

  const pending = signUp.isPending;
  const confirmationRequired = signUp.isSuccess && signUp.data.emailConfirmationRequired;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.onSurface }]}>Konto erstellen</Text>
        <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>
          Werde Teil deines PfotenNetzes und organisiere Hilfe in deiner Nachbarschaft.
        </Text>

        <Card>
          {confirmationRequired ? (
            <>
              <Text style={[styles.successTitle, { color: c.success }]}>Fast geschafft!</Text>
              <Text style={[styles.successText, { color: c.onSurfaceVariant }]}>
                Bitte bestätige die Nachricht an {email.trim().toLowerCase()}. Danach kannst du dich
                anmelden.
              </Text>
              <ActionButton title="Zur Anmeldung" onPress={() => router.replace('/(auth)/login')} />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: c.onSurface }]}>Anzeigename</Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                editable={!pending}
                onChangeText={setDisplayName}
                placeholder="Vorname oder Spitzname"
                placeholderTextColor={c.outline}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={displayName}
              />

              <Text style={[styles.label, { color: c.onSurface }]}>E-Mail</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!pending}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="name@beispiel.de"
                placeholderTextColor={c.outline}
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
                autoComplete="new-password"
                editable={!pending}
                onChangeText={setPassword}
                placeholder="Mindestens 8 Zeichen"
                placeholderTextColor={c.outline}
                secureTextEntry
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

              <Text style={[styles.label, { color: c.onSurface }]}>Passwort wiederholen</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!pending}
                onChangeText={setPasswordConfirmation}
                onSubmitEditing={handleSignUp}
                placeholder="Passwort wiederholen"
                placeholderTextColor={c.outline}
                returnKeyType="go"
                secureTextEntry
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={passwordConfirmation}
              />

              {formHint !== null ? (
                <Text style={[styles.hint, { color: c.tertiary }]}>{formHint}</Text>
              ) : null}
              {signUp.isError ? (
                <ErrorBox message={friendlySignUpError(signUp.error.message)} />
              ) : null}
              <ActionButton title="Konto erstellen" pending={pending} onPress={handleSignUp} />
            </>
          )}
        </Card>

        {!confirmationRequired ? (
          <Pressable
            accessibilityRole="link"
            disabled={pending}
            onPress={() => router.back()}
            style={styles.loginLink}
          >
            <Text style={[styles.linkText, { color: c.primary }]}>Zurück zur Anmeldung</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: {
    fontFamily: appFonts.extrabold,
    fontSize: 30,
    lineHeight: 38,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: appFonts.regular,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontFamily: appFonts.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: appFonts.regular,
    fontSize: 15,
  },
  hint: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 12 },
  successTitle: { fontFamily: appFonts.extrabold, fontSize: 22, lineHeight: 30, marginBottom: 8 },
  successText: { fontFamily: appFonts.regular, fontSize: 15, lineHeight: 24, marginBottom: 12 },
  loginLink: { alignSelf: 'center', padding: 12 },
  linkText: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
});
