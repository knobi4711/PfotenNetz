import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOwnAvailabilities, useOwnPets, useOwnProfile } from '@pfotennetz/supabase';
import {
  closeOnboarding,
  hasCompletedOnboarding,
  isOnboardingVisible,
  markOnboardingCompleted,
  openOnboarding,
  subscribeOnboarding,
} from '../lib/onboarding';
import {
  buildOnboardingSteps,
  firstOpenStepIndex,
  firstOpenTaskIndex,
  type OnboardingStep,
  type OnboardingTarget,
} from '@pfotennetz/shared';
import { ActionButton, appFonts, usePalette } from './ui';

const STEP_ICONS: Record<OnboardingStep['id'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  intro: 'compass-outline',
  profile: 'account-circle-outline',
  pets: 'paw-outline',
  helper: 'hand-heart-outline',
};

function openTarget(target: OnboardingTarget): void {
  if (target === 'pet-new') {
    router.push({ pathname: '/(tabs)/pets', params: { new: '1' } });
    return;
  }
  if (target === 'profile-address') {
    router.push({ pathname: '/(tabs)/profile', params: { section: 'standort' } });
    return;
  }
  if (target === 'profile-helper') {
    router.push({ pathname: '/(tabs)/profile', params: { section: 'helfer' } });
    return;
  }
  router.push({ pathname: '/(tabs)/profile', params: { edit: '1' } });
}

/**
 * First-run assistant: guides through the own profile, the pet profile and the
 * optional helper profile. Rendered once near the app root and reopened from
 * the profile screen.
 */
export function OnboardingWizard({ userId }: { userId: string }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const visible = useSyncExternalStore(subscribeOnboarding, isOnboardingVisible, () => false);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoStep = useRef(true);

  const profileQuery = useOwnProfile();
  const petsQuery = useOwnPets();
  const availabilitiesQuery = useOwnAvailabilities();

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
    let active = true;
    void hasCompletedOnboarding(userId).then((done) => {
      if (!active) return;
      setCheckedStorage(true);
      if (!done) openOnboarding();
    });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!visible) {
      autoStep.current = false;
      return;
    }
    autoStep.current = true;
    setStepIndex(firstOpenStepIndex(stepsRef.current));
  }, [visible]);

  // Data often arrives after the sheet opened: keep following the first open
  // step until the user navigates by hand.
  const readiness = steps.map((entry) => (entry.done ? '1' : '0')).join('');
  useEffect(() => {
    if (!visible || !autoStep.current) return;
    setStepIndex(firstOpenStepIndex(stepsRef.current));
  }, [visible, readiness]);

  // Closing the assistant counts as "seen": it never nags on later starts and
  // can be reopened from the profile screen at any time.
  const close = () => {
    void markOnboardingCompleted(userId);
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
    openTarget(step.target);
  };

  if (!checkedStorage) return null;

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex] ?? steps[0];
  if (step === undefined) return null;
  const isLast = safeIndex === steps.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Einführung schließen"
          onPress={close}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            { backgroundColor: c.surfaceContainerLow, paddingBottom: 18 + insets.bottom },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={[styles.eyebrow, { color: c.onSurfaceVariant }]}>
              Schritt {safeIndex + 1} von {steps.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Einführung schließen"
              onPress={close}
              hitSlop={10}
            >
              <Text style={[styles.later, { color: c.onSurfaceVariant }]}>Schließen</Text>
            </Pressable>
          </View>

          <View style={styles.dotsRow}>
            {steps.map((entry, index) => {
              const active = index === safeIndex;
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: active
                        ? c.primary
                        : entry.done
                          ? c.secondary
                          : c.surfaceContainerHighest,
                      width: active ? 22 : 8,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={[styles.iconBubble, { backgroundColor: c.primaryFixed }]}>
            <MaterialCommunityIcons name={STEP_ICONS[step.id]} size={30} color={c.onPrimaryFixed} />
          </View>

          <Text accessibilityRole="header" style={[styles.title, { color: c.onSurface }]}>
            {step.title}
          </Text>
          <Text style={[styles.summary, { color: c.onSurfaceVariant }]}>{step.summary}</Text>

          {step.bullets === undefined ? null : (
            <View style={styles.bullets}>
              {step.bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <MaterialCommunityIcons name="paw" size={14} color={c.primary} />
                  <Text style={[styles.bulletText, { color: c.onSurface }]}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}

          {step.kind === 'intro' ? null : (
            <View style={styles.statusRow}>
              <MaterialCommunityIcons
                name={step.done ? 'check-circle' : 'progress-clock'}
                size={16}
                color={step.done ? c.secondary : c.onSurfaceVariant}
              />
              <Text
                style={[styles.statusText, { color: step.done ? c.secondary : c.onSurfaceVariant }]}
              >
                {step.done
                  ? 'Bereits erledigt'
                  : step.optional
                    ? 'Optional – noch offen'
                    : 'Noch offen'}
              </Text>
            </View>
          )}

          <ActionButton
            title={step.actionLabel}
            variant={step.kind === 'task' && step.done ? 'secondary' : 'primary'}
            onPress={() => startStep(step)}
          />

          <View style={styles.footerRow}>
            {safeIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  autoStep.current = false;
                  setStepIndex(safeIndex - 1);
                }}
                style={[styles.footerButton, { borderColor: c.outlineVariant }]}
              >
                <Text style={[styles.footerText, { color: c.onSurface }]}>Zurück</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isLast) {
                  close();
                  return;
                }
                autoStep.current = false;
                setStepIndex(safeIndex + 1);
              }}
              style={[styles.footerButton, styles.footerPrimary, { backgroundColor: c.surface }]}
            >
              <Text style={[styles.footerText, { color: c.onSurface }]}>
                {isLast ? 'Fertig' : 'Weiter'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: appFonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.4 },
  later: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  iconBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  title: { fontFamily: appFonts.extrabold, fontSize: 22, lineHeight: 28, marginTop: 14 },
  summary: { fontFamily: appFonts.medium, fontSize: 13, lineHeight: 20, marginTop: 6 },
  bullets: { marginTop: 12, gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletText: { flex: 1, fontFamily: appFonts.medium, fontSize: 13, lineHeight: 19 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  statusText: { fontFamily: appFonts.semibold, fontSize: 12, lineHeight: 17 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  footerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerPrimary: { borderColor: 'transparent' },
  footerText: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
});
