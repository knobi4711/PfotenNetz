/**
 * Content of the first-run assistant, shared by the mobile app and the web
 * client. The order is fixed: a short feature overview first, then the own
 * profile, the pet profile(s), and as an optional last step the helper profile.
 * Keeping the decisions here makes them testable without React Native.
 */

export type OnboardingStepId = 'intro' | 'profile' | 'pets' | 'helper';

export type OnboardingTarget = 'profile-edit' | 'profile-address' | 'pet-new' | 'profile-helper';

export interface OnboardingFacts {
  displayName: string | null;
  hasAddress: boolean;
  petCount: number;
  availabilityCount: number;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  /** Informational steps only explain the app; task steps jump to a screen. */
  kind: 'intro' | 'task';
  title: string;
  summary: string;
  /** Short feature list, rendered as bullets for the intro step. */
  bullets?: readonly string[];
  /** Label of the button that jumps to the matching screen. */
  actionLabel: string;
  target: OnboardingTarget | null;
  done: boolean;
  optional: boolean;
}

export function buildOnboardingSteps(facts: OnboardingFacts): OnboardingStep[] {
  const hasName = (facts.displayName ?? '').trim().length >= 2;
  const profileDone = hasName && facts.hasAddress;

  return [
    {
      id: 'intro',
      kind: 'intro',
      title: 'Willkommen bei PfotenNetz',
      summary:
        'PfotenNetz verbindet Tierhalter:innen und Helfer:innen in deiner Nachbarschaft. ' +
        'Das Wichtigste auf einen Blick:',
      bullets: [
        'Betreuung finden und anbieten – Gassi, Füttern, Urlaub oder Tagesbetreuung.',
        'Tierprofile mit Notfallkarte für unterwegs.',
        'Karte, Gefahrenradar und Vermisstenmeldungen in deiner Nähe.',
        'Community, Tauschbörse und Zeitbank für faire Nachbarschaftshilfe.',
      ],
      actionLabel: 'Los geht’s',
      target: null,
      done: true,
      optional: true,
    },
    {
      id: 'profile',
      kind: 'task',
      title: 'Dein Profil',
      summary:
        'Name, Telefon und der Ort, an dem deine Tiere zu Hause sind. Die genaue Adresse wird nie öffentlich ' +
        'angezeigt – sie dient nur der Nachbarschaftssuche.',
      actionLabel: facts.hasAddress ? 'Profildaten bearbeiten' : 'Adresse festlegen',
      target: facts.hasAddress ? 'profile-edit' : 'profile-address',
      done: profileDone,
      optional: false,
    },
    {
      id: 'pets',
      kind: 'task',
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
      kind: 'task',
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

/**
 * The assistant always opens with the feature overview, so the intro step wins
 * over the first unfinished task. Without an intro the first open task is used.
 */
export function firstOpenStepIndex(steps: readonly OnboardingStep[]): number {
  if (steps.length === 0) return 0;
  const introIndex = steps.findIndex((step) => step.kind === 'intro');
  if (introIndex !== -1) return introIndex;
  const index = steps.findIndex((step) => !step.done);
  return index === -1 ? steps.length - 1 : index;
}

/** First unfinished task after the overview, or the last step when all are done. */
export function firstOpenTaskIndex(steps: readonly OnboardingStep[]): number {
  const index = steps.findIndex((step) => step.kind === 'task' && !step.done);
  return index === -1 ? Math.max(0, steps.length - 1) : index;
}

/** Required steps decide whether the assistant may stop appearing on startup. */
export function onboardingComplete(steps: readonly OnboardingStep[]): boolean {
  return steps.filter((step) => !step.optional).every((step) => step.done);
}

export function completedStepCount(steps: readonly OnboardingStep[]): number {
  return steps.filter((step) => step.done).length;
}
