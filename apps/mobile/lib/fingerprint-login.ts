// Android fingerprint sign-in: biometric unlock for stored email/password
// credentials. Used instead of passkeys on Android; iOS and web keep passkeys.
//
// Security notes:
// - Credentials live in expo-secure-store (Android: SharedPreferences,
//   encrypted with the Android Keystore). Values here are small (< 100 bytes).
// - Reading requires an explicit fingerprint prompt first. We intentionally do
//   NOT use SecureStore `requireAuthentication`, because the OS invalidates
//   such keys when biometric enrollment changes (e.g. new fingerprint added),
//   which would silently delete the stored credentials.

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CREDENTIAL_EMAIL_KEY = 'pfotennetz.biometric.email';
const CREDENTIAL_PASSWORD_KEY = 'pfotennetz.biometric.password';

export class FingerprintCancelledError extends Error {
  constructor() {
    super('Die Fingerabdruck-Anfrage wurde abgebrochen.');
    this.name = 'FingerprintCancelledError';
  }
}

export interface FingerprintCapabilities {
  available: boolean;
  enrolled: boolean;
}

/** True when the device has fingerprint hardware (regardless of enrollment). */
export async function getFingerprintCapabilities(): Promise<FingerprintCapabilities> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    return { available: hasHardware && hasFingerprint, enrolled: isEnrolled };
  } catch {
    return { available: false, enrolled: false };
  }
}

export async function hasStoredCredentials(): Promise<boolean> {
  try {
    const [email, password] = await Promise.all([
      SecureStore.getItemAsync(CREDENTIAL_EMAIL_KEY),
      SecureStore.getItemAsync(CREDENTIAL_PASSWORD_KEY),
    ]);
    return email !== null && email.length > 0 && password !== null && password.length > 0;
  } catch {
    return false;
  }
}

export async function storeCredentials(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(CREDENTIAL_EMAIL_KEY, email);
  await SecureStore.setItemAsync(CREDENTIAL_PASSWORD_KEY, password);
}

export async function clearStoredCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIAL_EMAIL_KEY);
  await SecureStore.deleteItemAsync(CREDENTIAL_PASSWORD_KEY);
}

/** Shows the system fingerprint prompt. Throws on cancel or failed attempts. */
export async function authenticateWithFingerprint(): Promise<void> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Mit Fingerabdruck anmelden',
    promptSubtitle: 'Halte deinen Finger auf den Sensor.',
    cancelLabel: 'Abbrechen',
    disableDeviceFallback: true,
    biometricsSecurityLevel: 'strong',
  });
  if (result.success) {
    return;
  }
  const code = result.error;
  if (code === 'user_cancel' || code === 'system_cancel' || code === 'app_cancel') {
    throw new FingerprintCancelledError();
  }
  if (code === 'lockout') {
    throw new Error('Zu viele Fehlversuche. Der Fingerabdruck ist vorübergehend gesperrt.');
  }
  throw new Error('Fingerabdruck wurde nicht erkannt. Bitte versuche es erneut.');
}

/**
 * Full fingerprint sign-in flow: biometric prompt, then sign in with the
 * stored credentials. Throws FingerprintCancelledError when the user aborts.
 */
export async function signInWithFingerprint(
  signIn: (email: string, password: string) => Promise<unknown>
): Promise<void> {
  await authenticateWithFingerprint();
  const [email, password] = await Promise.all([
    SecureStore.getItemAsync(CREDENTIAL_EMAIL_KEY),
    SecureStore.getItemAsync(CREDENTIAL_PASSWORD_KEY),
  ]);
  if (email === null || email.length === 0 || password === null || password.length === 0) {
    throw new Error(
      'Keine gespeicherten Zugangsdaten gefunden. Bitte melde dich mit E-Mail und Passwort an.'
    );
  }
  await signIn(email, password);
}

export function friendlyFingerprintError(error: unknown): string {
  if (error instanceof FingerprintCancelledError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `Anmeldung mit Fingerabdruck fehlgeschlagen: ${error.message}`;
  }
  return 'Anmeldung mit Fingerabdruck fehlgeschlagen.';
}
