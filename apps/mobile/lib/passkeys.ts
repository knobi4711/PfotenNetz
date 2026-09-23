import { getSupabaseClient } from '@pfotennetz/supabase';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type * as PasskeysApi from 'react-native-passkeys';
import { PasskeyCancelledError } from './passkey-errors';

export { friendlyPasskeyError } from './passkey-errors';

type PasskeysModule = typeof PasskeysApi;

function loadPasskeys(): PasskeysModule | null {
  if (requireOptionalNativeModule('ReactNativePasskeys') === null) {
    return null;
  }

  try {
    // Lazy loading keeps Expo Go and older development builds usable even
    // though they do not contain the native Credential Manager module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-passkeys') as PasskeysModule;
  } catch {
    return null;
  }
}

function requirePasskeys(): PasskeysModule {
  const passkeys = loadPasskeys();
  if (passkeys === null) {
    throw new Error('Passkeys benötigen einen aktuellen Development Build.');
  }
  return passkeys;
}

export function isPasskeySupported(): boolean {
  try {
    return loadPasskeys()?.isSupported() ?? false;
  } catch {
    return false;
  }
}

export async function signInWithNativePasskey(): Promise<void> {
  const passkeys = requirePasskeys();
  const client = getSupabaseClient();
  const start = await client.auth.passkey.startAuthentication();
  if (start.error) throw start.error;

  const credential = await passkeys.get(start.data.options as Parameters<PasskeysModule['get']>[0]);
  if (credential === null) throw new PasskeyCancelledError();

  const verified = await client.auth.passkey.verifyAuthentication({
    challengeId: start.data.challenge_id,
    credential,
  });
  if (verified.error) throw verified.error;
}

export async function registerNativePasskey(): Promise<void> {
  const passkeys = requirePasskeys();
  const client = getSupabaseClient();
  const start = await client.auth.passkey.startRegistration();
  if (start.error) throw start.error;

  const credential = await passkeys.create(
    start.data.options as Parameters<PasskeysModule['create']>[0]
  );
  if (credential === null) throw new PasskeyCancelledError();

  // getPublicKey is a library helper, not part of the WebAuthn JSON response.
  const { getPublicKey: _getPublicKey, ...response } = credential.response;
  void _getPublicKey;
  const verified = await client.auth.passkey.verifyRegistration({
    challengeId: start.data.challenge_id,
    credential: { ...credential, response },
  });
  if (verified.error) throw verified.error;
}
