/**
 * Web counterpart of the mobile onboarding store. The first-run assistant is
 * stored per account in localStorage so a shared browser guides every login
 * once and signing out does not mark another person's tour as seen.
 */
const storageKey = (userId: string) => `pfotennetz.onboarding.v1.${userId}`;

/** Keeps the tour closed for the running session even if storage is blocked. */
let completedInSession: string | null = null;

function readValue(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeValue(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Private mode can block storage; the session flag still applies.
  }
}

export function hasCompletedOnboarding(userId: string): boolean {
  if (completedInSession === userId) return true;
  return readValue(storageKey(userId)) === '1';
}

export function markOnboardingCompleted(userId: string): void {
  completedInSession = userId;
  writeValue(storageKey(userId), '1');
}

// The assistant is rendered once near the app root, but reopened from the
// profile screen. A tiny external store keeps both in sync without a provider.
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
