import { useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp } from '@pfotennetz/supabase';
import { ActionButton, Card, ErrorBox, appFonts, usePalette } from '../../components/ui';
import { friendlyAuthError } from '../../lib/auth-errors';

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
    signUp.mutate({
      displayName: trimmedName,
      email: trimmedEmail,
      password,
      emailRedirectTo: Linking.createURL('callback'),
    });
  };

  const pending = signUp.isPending;
  const confirmationRequired = signUp.isSuccess && signUp.data.emailConfirmationRequired;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[styles.title, { color: c.onSurface }]}>
          Konto erstellen
        </Text>
        <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>
          Werde Teil deines PfotenNetzes und organisiere Hilfe in deiner Nachbarschaft.
        </Text>

        <Card>
          {confirmationRequired ? (
            <>
              <Text accessibilityRole="header" style={[styles.successTitle, { color: c.success }]}>
                Fast geschafft!
              </Text>
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
                accessibilityLabel="Anzeigename"
                accessibilityHint="Vorname oder Spitzname"
                autoCapitalize="words"
                autoComplete="name"
                editable={!pending}
                onChangeText={setDisplayName}
                placeholder="Vorname oder Spitzname"
                placeholderTextColor={c.placeholder}
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
                accessibilityLabel="E-Mail-Adresse"
                accessibilityHint="Zum Erstellen des Kontos erforderlich"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!pending}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="name@beispiel.de"
                placeholderTextColor={c.placeholder}
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
                accessibilityLabel="Passwort"
                accessibilityHint="Mindestens acht Zeichen"
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!pending}
                onChangeText={setPassword}
                placeholder="Mindestens 8 Zeichen"
                placeholderTextColor={c.placeholder}
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
                accessibilityLabel="Passwort wiederholen"
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!pending}
                onChangeText={setPasswordConfirmation}
                onSubmitEditing={handleSignUp}
                placeholder="Passwort wiederholen"
                placeholderTextColor={c.placeholder}
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
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={[styles.hint, { color: c.warningText }]}
                >
                  {formHint}
                </Text>
              ) : null}
              {signUp.isError ? (
                <ErrorBox message={friendlyAuthError(signUp.error, 'signup')} />
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
