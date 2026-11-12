'use client';

import {
  buildOnboardingSteps,
  firstOpenStepIndex,
  firstOpenTaskIndex,
  type OnboardingStep,
  type OnboardingTarget,
} from '@pfotennetz/shared';
import { useOwnAvailabilities, useOwnPets, useOwnProfile, useAuth } from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  closeOnboarding,
  hasCompletedOnboarding,
  isOnboardingVisible,
  markOnboardingCompleted,
  openOnboarding,
  subscribeOnboarding,
} from '../lib/onboarding';
import { useDialogFocus } from '../lib/dialog-focus';
import { Portal } from './Portal';

const TARGET_HREFS: Record<OnboardingTarget, string> = {
  'profile-edit': '/profile',
  'profile-address': '/profile#tier-zuhause',
  'pet-new': '/pets#neues-tier',
  'profile-helper': '/profile#verfuegbarkeiten',
};

const STEP_ICONS: Record<OnboardingStep['id'], string> = {
  intro: '🧭',
  profile: '👤',
  pets: '🐾',
  helper: '🤝',
};

/**
 * Auth gate for the global mount point: the assistant only exists for signed-in
 * users, so public pages (legal, login, emergency cards) stay untouched.
 */
export function OnboardingWizardHost() {
  const auth = useAuth();
  if (auth.status !== 'authenticated' || auth.userId === null) return null;
  return <OnboardingWizard userId={auth.userId} />;
}

/**
 * Mounted once near the app root. It only runs the storage check and renders
 * the dialog when it is actually open, so no profile queries fire on every
 * page in the background.
 */
export function OnboardingWizard({ userId }: { userId: string }) {
  const visible = useSyncExternalStore(subscribeOnboarding, isOnboardingVisible, () => false);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    if (hasCompletedOnboarding(userId)) {
      setCheckedStorage(true);
      return;
    }
    setCheckedStorage(true);
    openOnboarding();
  }, [userId]);

  if (!checkedStorage || !visible) return null;
  return <OnboardingDialog userId={userId} />;
}

function OnboardingDialog({ userId }: { userId: string }) {
  const router = useRouter();
  const profileQuery = useOwnProfile();
  const petsQuery = useOwnPets();
  const availabilitiesQuery = useOwnAvailabilities();
  const [stepIndex, setStepIndex] = useState(0);
  const autoStep = useRef(true);

  const profile = profileQuery.data ?? null;
  const steps = buildOnboardingSteps({
    displayName: profile?.display_name ?? null,
    hasAddress: Boolean(profile?.private_address) && /^\d{5}$/.test(profile?.postal_code ?? ''),
    petCount: petsQuery.data?.length ?? 0,
    availabilityCount: availabilitiesQuery.data?.length ?? 0,
  });
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    setStepIndex(firstOpenStepIndex(stepsRef.current));
  }, []);

  // Data often arrives after the sheet opened: keep following the first open
  // step until the user navigates by hand.
  const readiness = steps.map((entry) => (entry.done ? '1' : '0')).join('');
  useEffect(() => {
    if (!autoStep.current) return;
    setStepIndex(firstOpenStepIndex(stepsRef.current));
  }, [readiness]);

  const close = () => {
    markOnboardingCompleted(userId);
    closeOnboarding();
  };

  const startStep = (step: OnboardingStep) => {
    if (step.target === null) {
      // The overview has no screen of its own: continue with the first task.
      autoStep.current = false;
      setStepIndex(firstOpenTaskIndex(stepsRef.current));
      return;
    }
    close();
    router.push(TARGET_HREFS[step.target]);
  };

  // Fokus, Tab-Falle, Escape und Hintergrund-Inert übernimmt der Hook.
  const panelRef = useDialogFocus(true, close);

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex] ?? steps[0];
  if (step === undefined) return null;
  const isLast = safeIndex === steps.length - 1;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <button
          type="button"
          aria-label="Einführung schließen"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full cursor-default"
          onClick={close}
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          className="relative w-full max-w-lg rounded-t-3xl bg-surface-container-low p-6 shadow-2xl outline-none sm:rounded-3xl"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
              Schritt {safeIndex + 1} von {steps.length}
            </p>
            <button
              type="button"
              className="text-sm font-bold text-on-surface-variant hover:text-on-surface"
              onClick={close}
            >
              Schließen
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
            {steps.map((entry, index) => (
              <span
                key={entry.id}
                className={`h-2 rounded-full ${
                  index === safeIndex
                    ? 'w-6 bg-primary'
                    : entry.done
                      ? 'w-2 bg-secondary'
                      : 'w-2 bg-surface-container-highest'
                }`}
              />
            ))}
          </div>

          <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-2xl">
            <span aria-hidden="true">{STEP_ICONS[step.id]}</span>
          </div>

          <h2
            id="onboarding-title"
            data-autofocus
            tabIndex={-1}
            className="mt-4 text-2xl font-extrabold text-on-surface outline-none"
          >
            {step.title}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">{step.summary}</p>

          {step.bullets === undefined ? null : (
            <ul className="mt-4 space-y-2">
              {step.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-on-surface">
                  <span aria-hidden="true" className="mt-0.5 text-primary">
                    🐾
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {step.kind === 'intro' ? null : (
            <p className="mt-4 text-xs font-bold text-on-surface-variant">
              {step.done
                ? '✓ Bereits erledigt'
                : step.optional
                  ? 'Optional – noch offen'
                  : 'Noch offen'}
            </p>
          )}

          <button
            type="button"
            className={`mt-5 w-full ${step.kind === 'task' && step.done ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => startStep(step)}
          >
            {step.actionLabel}
          </button>

          <div className="mt-3 flex gap-3">
            {safeIndex > 0 ? (
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  autoStep.current = false;
                  setStepIndex(safeIndex - 1);
                }}
              >
                Zurück
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => {
                if (isLast) {
                  close();
                  return;
                }
                autoStep.current = false;
                setStepIndex(safeIndex + 1);
              }}
            >
              {isLast ? 'Fertig' : 'Weiter'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
