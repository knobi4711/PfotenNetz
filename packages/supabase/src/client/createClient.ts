// PfotenNetz Supabase Client - Single Source of Truth
// Uses experimental Passkey support as per Supabase v2.105+
// Platform-specific storage abstraction for Web, Native, SSR

import type { SupabaseClient, Session, User, SupportedStorage } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

// Environment variables - validated at runtime, not import time
// Supports multiple frameworks: Expo (EXPO_PUBLIC_*), Next.js (NEXT_PUBLIC_*), generic (SUPABASE_*)
function getSupabaseConfig(): { url: string; anonKey: string } {
  // URL: Expo > Next.js > Generic
  const url =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  // Anon Key: Expo > Next.js > Generic
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase environment variables not configured. ' +
        'Set one of: EXPO_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL ' +
        'and EXPO_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY'
    );
  }

  return { url, anonKey };
}

/**
 * Detect if running in a browser environment
 * Uses safe global checks that work across Node, SSR, and browser
 */
function isBrowser(): boolean {
  // In browser: window exists and has localStorage
  // In SSR/Node: window is undefined
  // In React Native: window is undefined
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Storage adapter interface matching Supabase's SupportedStorage
 * This allows us to use platform-appropriate storage without coupling to specific implementations
 */
let configuredStorage: SupportedStorage | undefined;

/** Configure platform storage before the singleton client is first requested. */
export function configureSupabaseStorage(storage: SupportedStorage): void {
  if (supabaseInstance !== null) {
    return;
  }
  configuredStorage = storage;
}

function createStorageAdapter(): SupportedStorage | undefined {
  // Browser: Use localStorage
  if (isBrowser()) {
    return window.localStorage;
  }

  // Native clients inject SecureStore from their platform entry point. SSR has
  // no persistent storage by design.
  return configuredStorage;
}

// Singleton client instance
let supabaseInstance: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseConfig();

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      experimental: {
        passkey: true, // Enable Passkey support (experimental)
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: createStorageAdapter(),
    },
  });

  return supabaseInstance;
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    return createSupabaseClient();
  }
  return supabaseInstance;
}

// Auth helpers
export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const { data } = await getSupabaseClient().auth.getUser();
  return data.user;
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return getSupabaseClient().auth.onAuthStateChange(callback);
}

export default getSupabaseClient;
