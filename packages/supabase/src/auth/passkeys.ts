// PfotenNetz Passkey Authentication
// Uses Supabase Native Passkey Support (experimental)
// Requires @supabase/supabase-js >= 2.105.0

import { getSupabaseClient } from '../client/createClient';

export async function registerPasskey() {
  const { data, error } = await getSupabaseClient().auth.registerPasskey();
  if (error) throw error;
  return data;
}

export async function signInWithPasskey() {
  const { data, error } = await getSupabaseClient().auth.signInWithPasskey();
  if (error) throw error;
  return data;
}

export async function listPasskeys() {
  const { data, error } = await getSupabaseClient().auth.passkey.list();
  if (error) throw error;
  return data;
}

export async function updatePasskey(passkeyId: string, friendlyName: string) {
  const { error } = await getSupabaseClient().auth.passkey.update({ passkeyId, friendlyName });
  if (error) throw error;
}

export async function deletePasskey(credentialId: string) {
  const { error } = await getSupabaseClient().auth.passkey.delete({ passkeyId: credentialId });
  if (error) throw error;
}

// Note: WebAuthn ceremony on iOS/Android requires:
// - Development Build (not Expo Go)
// - react-native-webauthn or expo-web-authn
// - Native Passkey support is currently PoC status
// - Web Passkeys work natively via browser WebAuthn API
