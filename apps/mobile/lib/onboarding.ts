import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * The first-run assistant is stored per account: a shared device guides every
 * login once, and signing out must not mark another person's tour as seen.
 */
const storageKey = (userId: string) => `pfotennetz.onboarding.v1.${userId}`;

/** Keeps the tour closed for the running session even if the device storage fails. */
let completedInSession: string | null = null;

function readWebValue(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeWebValue(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode); the session flag still applies.
  }
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  if (completedInSession === userId) return true;
  if (Platform.OS === 'web') return readWebValue(storageKey(userId)) === '1';
  try {
    return (await SecureStore.getItemAsync(storageKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  completedInSession = userId;
  if (Platform.OS === 'web') {
    writeWebValue(storageKey(userId), '1');
    return;
  }
  try {
    await SecureStore.setItemAsync(storageKey(userId), '1');
  } catch {
    // The in-memory flag keeps the tour closed until the app restarts.
  }
}

// The assistant is rendered once near the root, but reopened from the profile
// screen. A tiny external store keeps both in sync without a provider.
let visible = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeOnboarding(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isOnboardingVisible(): boolean {
  return visible;
}

export function openOnboarding(): void {
  if (visible) return;
  visible = true;
  notify();
}

export function closeOnboarding(): void {
  if (!visible) return;
  visible = false;
  notify();
}
