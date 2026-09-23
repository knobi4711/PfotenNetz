// PfotenNetz Native Storage - SecureStore wrapper
// For sensitive data: auth tokens, credentials, user preferences

import * as SecureStore from 'expo-secure-store';

export async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function getAllSecureKeys(): Promise<string[]> {
  // SecureStore doesn't expose keys directly
  // This is a placeholder for when we need it
  return [];
}

// App-specific keys
export const SECURE_KEYS = {
  AUTH_TOKEN: 'pfotennetz.auth.token',
  REFRESH_TOKEN: 'pfotennetz.auth.refresh',
  BIOMETRY_ENABLED: 'pfotennetz.biometry.enabled',
  PASSKEY_CREDENTIALS: 'pfotennetz.passkey.credentials',
  LAST_SESSION: 'pfotennetz.session.last',
} as const;
