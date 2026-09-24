export * from './passkeys';
export * from './registration';
export * from './session';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSessionMissingError } from './session';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await (
    await import('../client/createClient')
  )
    .getSupabaseClient()
    .auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  options?: {
    emailRedirectTo?: string;
    data?: Record<string, unknown>;
    captchaToken?: string;
    channel?: 'sms' | 'whatsapp';
  }
) {
  // SignUpWithPasswordCredentials requires options to be an object, not undefined
  const signUpOptions = options ?? {};
  const { data, error } = await (
    await import('../client/createClient')
  )
    .getSupabaseClient()
    .auth.signUp({ email, password, options: signUpOptions });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { getSupabaseClient } = await import('../client/createClient');
  const client = getSupabaseClient();
  const fallbackToLocal = async (serverError: unknown) => {
    // Server-side logout failed (offline, gateway/proxy error, ...). The user
    // explicitly asked to sign out, so drop the local session anyway –
    // otherwise they stay trapped signed-in on this device. The server-side
    // refresh token remains valid until expiry, but the device holds nothing.
    console.warn(
      `[auth] server sign-out failed (${describeError(serverError)}), cleared local session instead`
    );
    await removeLocalSession(client);
  };
  try {
    const { error } = await client.auth.signOut();
    if (!error || isSessionMissingError(error)) {
      return;
    }
    await fallbackToLocal(error);
  } catch (error) {
    if (isSessionMissingError(error)) {
      return;
    }
    await fallbackToLocal(error);
  }
}

/**
 * Drops the local session and notifies auth subscribers (SIGNED_OUT) without
 * any server call. Uses the SDK's own session removal when available
 * (feature-detected so SDK upgrades cannot break this at runtime).
 */
async function removeLocalSession(client: SupabaseClient): Promise<void> {
  const auth = client.auth as unknown as { _removeSession?: unknown };
  if (typeof auth._removeSession === 'function') {
    await (auth._removeSession as () => Promise<void>).call(client.auth);
    return;
  }
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    for (const key of ['message', 'msg', 'error_description', 'error']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
  }
  return String(error);
}

export async function resetPassword(email: string) {
  const { data, error } = await (
    await import('../client/createClient')
  )
    .getSupabaseClient()
    .auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
}

export async function updatePassword(password: string) {
  const { data, error } = await (
    await import('../client/createClient')
  )
    .getSupabaseClient()
    .auth.updateUser({ password });
  if (error) throw error;
  return data;
}
