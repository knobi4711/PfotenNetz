/**
 * Content of the first-run assistant. The order is fixed: own profile first,
 * then the pet profile(s), and as an optional last step the helper profile.
 * Keeping the decisions here makes them testable without React Native.
 */

export type OnboardingStepId = 'profile' | 'pets' | 'helper';

export type OnboardingTarget = 'profile-edit' | 'profile-address' | 'pet-new' | 'profile-helper';

export interface OnboardingFacts {
  displayName: string | null;
  hasAddress: boolean;
  petCount: number;
  availabilityCount: number;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  summary: string;
  /** Label of the button that jumps to the matching screen. */
  actionLabel: string;
  target: OnboardingTarget;
  done: boolean;
  optional: boolean;
}

export function buildOnboardingSteps(facts: OnboardingFacts): OnboardingStep[] {
  const hasName = (facts.displayName ?? '').trim().length >= 2;
  const profileDone = hasName && facts.hasAddress;

  return [
    {
      id: 'profile',
      title: 'Dein Profil',
      summary:
        'Name, Telefon und dein Vermittlungsstandort. Die genaue Adresse wird nie öffentlich ' +
        'angezeigt – sie dient nur der Nachbarschaftssuche.',
      actionLabel: facts.hasAddress ? 'Profildaten bearbeiten' : 'Adresse festlegen',
      target: facts.hasAddress ? 'profile-edit' : 'profile-address',
      done: profileDone,
      optional: false,
    },
    {
      id: 'pets',
      title: 'Dein Tier',
      summary:
        'Lege ein Tierprofil mit Foto, Alter und Gesundheitsinfos an. Daraus entsteht die ' +
        'Notfallkarte, die Helfer:innen unterwegs sehen.',
      actionLabel: 'Tierprofil anlegen',
      target: 'pet-new',
      done: facts.petCount > 0,
      optional: false,
    },
    {
      id: 'helper',
      title: 'Dein Helferprofil',
      summary:
        'Optional: Wenn du selbst Gassi gehst oder fütterst, hinterlege deine Verfügbarkeiten. ' +
        'Ohne Helferprofil nutzt du PfotenNetz nur als Tierhalter:in.',
      actionLabel: 'Verfügbarkeiten festlegen',
      target: 'profile-helper',
      done: facts.availabilityCount > 0,
      optional: true,
    },
  ];
}

/** Index of the first step that still needs work, or the last step when all are done. */
export function firstOpenStepIndex(steps: OnboardingStep[]): number {
  if (steps.length === 0) return 0;
  const index = steps.findIndex((step) => !step.done);
  return index === -1 ? steps.length - 1 : index;
}

/** Required steps decide whether the assistant may stop appearing on startup. */
export function onboardingComplete(steps: OnboardingStep[]): boolean {
  return steps.filter((step) => !step.optional).every((step) => step.done);
}

export function completedStepCount(steps: OnboardingStep[]): number {
  return steps.filter((step) => step.done).length;
}
