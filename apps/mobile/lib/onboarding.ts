import { isOnboardingStepId, type OnboardingStepId } from '@pfotennetz/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * The first-run assistant is stored per account: a shared device guides every
 * login once, and signing out must not mark another person's tour as seen.
 *
 * Progress is only "completed" once the required steps are done. As long as a
 * step is open the assistant returns on the next start and continues at the
 * remembered step.
 */
export interface OnboardingProgress {
  completed: boolean;
  lastStepId: OnboardingStepId | null;
}

export type OnboardingOpenMode = 'resume' | 'intro';

const progressKey = (userId: string) => `pfotennetz.onboarding.v2.${userId}`;
/**
 * Old flag from the version that marked the tour as seen as soon as it closed.
 * It only proves that the overview was shown, so these accounts continue with
 * the task steps instead of being treated as finished.
 */
const legacyKey = (userId: string) => `pfotennetz.onboarding.v1.${userId}`;

/** Caches the progress so navigation and writes within a session stay in sync. */
const cache = new Map<string, OnboardingProgress>();
const loading = new Map<string, Promise<OnboardingProgress>>();
const writes = new Map<string, Promise<void>>();

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
    // Storage can be blocked (private mode); the in-memory cache still applies.
  }
}

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return readWebValue(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    writeWebValue(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // The in-memory cache keeps the progress until the app restarts.
  }
}

function parseProgress(raw: string | null): OnboardingProgress | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const record = value as { completed?: unknown; lastStepId?: unknown };
    return {
      completed: record.completed === true,
      lastStepId: isOnboardingStepId(record.lastStepId) ? record.lastStepId : null,
    };
  } catch {
    return null;
  }
}

async function loadProgress(userId: string): Promise<OnboardingProgress> {
  const cached = cache.get(userId);
  if (cached !== undefined) return cached;
  const inFlight = loading.get(userId);
  if (inFlight !== undefined) return inFlight;

  const promise = (async (): Promise<OnboardingProgress> => {
    const stored = parseProgress(await readValue(progressKey(userId)));
    const progress: OnboardingProgress = stored ?? {
      completed: false,
      lastStepId: (await readValue(legacyKey(userId))) === '1' ? 'profile' : null,
    };
    cache.set(userId, progress);
    loading.delete(userId);
    return progress;
  })();
  loading.set(userId, promise);
  return promise;
}

/** Serializes writes per account so completion cannot be overwritten by a late step write. */
function persistProgress(userId: string, progress: OnboardingProgress): Promise<void> {
  const previous = writes.get(userId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => writeValue(progressKey(userId), JSON.stringify(progress)));
  writes.set(userId, next);
  return next;
}

export function readOnboardingProgress(userId: string): Promise<OnboardingProgress> {
  return loadProgress(userId);
}

export async function rememberOnboardingStep(
  userId: string,
  stepId: OnboardingStepId
): Promise<void> {
  const progress = await loadProgress(userId);
  if (progress.lastStepId === stepId) return;
  const next: OnboardingProgress = { completed: progress.completed, lastStepId: stepId };
  cache.set(userId, next);
  await persistProgress(userId, next);
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  const progress = await loadProgress(userId);
  if (progress.completed) return;
  const next: OnboardingProgress = { completed: true, lastStepId: progress.lastStepId };
  cache.set(userId, next);
  await persistProgress(userId, next);
}

// The assistant is rendered once near the root, but reopened from the profile
// screen. A tiny external store keeps both in sync without a provider.
let visible = false;
let openMode: OnboardingOpenMode = 'resume';
let pendingResume: { userId: string; stepId: OnboardingStepId } | null = null;
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

export function getOnboardingOpenMode(): OnboardingOpenMode {
  return openMode;
}

export function openOnboarding(mode: OnboardingOpenMode = 'resume'): void {
  openMode = mode;
  if (visible) return;
  visible = true;
  notify();
}

export function closeOnboarding(): void {
  if (!visible) return;
  visible = false;
  notify();
}

/**
 * Remembers which step the user left via its action button. As soon as that
 * step is done (profile saved, pet created) the assistant reopens and continues
 * with the next open step.
 */
export function setOnboardingResumePending(userId: string, stepId: OnboardingStepId): void {
  pendingResume = { userId, stepId };
  notify();
}

export function clearOnboardingResumePending(): void {
  if (pendingResume === null) return;
  pendingResume = null;
  notify();
}

export function getOnboardingResumeStepId(userId: string): OnboardingStepId | null {
  return pendingResume !== null && pendingResume.userId === userId ? pendingResume.stepId : null;
}
