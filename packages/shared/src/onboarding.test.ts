import { describe, expect, it } from 'vitest';
import {
  buildOnboardingSteps,
  completedStepCount,
  firstOpenStepIndex,
  firstOpenTaskIndex,
  onboardingComplete,
  type OnboardingFacts,
} from './onboarding';

const EMPTY: OnboardingFacts = {
  displayName: null,
  hasAddress: false,
  petCount: 0,
  availabilityCount: 0,
};

function facts(overrides: Partial<OnboardingFacts>): OnboardingFacts {
  return { ...EMPTY, ...overrides };
}

describe('buildOnboardingSteps', () => {
  it('starts with the feature overview and keeps profile, pets, helper in order', () => {
    expect(buildOnboardingSteps(EMPTY).map((step) => step.id)).toEqual([
      'intro',
      'profile',
      'pets',
      'helper',
    ]);
  });

  it('marks the overview and the helper profile as optional', () => {
    const steps = buildOnboardingSteps(EMPTY);
    expect(steps.map((step) => step.optional)).toEqual([true, false, false, true]);
  });

  it('lists the app features without a navigation target', () => {
    const intro = buildOnboardingSteps(EMPTY)[0]!;
    expect(intro.kind).toBe('intro');
    expect(intro.target).toBeNull();
    expect(intro.bullets?.length).toBeGreaterThanOrEqual(3);
  });

  it('asks for the address first when the profile has no location yet', () => {
    const profile = buildOnboardingSteps(facts({ displayName: 'König' }))[1]!;
    expect(profile.done).toBe(false);
    expect(profile.target).toBe('profile-address');
    expect(profile.actionLabel).toBe('Adresse festlegen');
  });

  it('offers the profile form once an address exists', () => {
    const profile = buildOnboardingSteps(facts({ displayName: 'König', hasAddress: true }))[1]!;
    expect(profile.done).toBe(true);
    expect(profile.target).toBe('profile-edit');
  });

  it('requires a real display name next to the address', () => {
    const profile = buildOnboardingSteps(facts({ displayName: ' K ', hasAddress: true }))[1]!;
    expect(profile.done).toBe(false);
  });

  it('treats the first pet and the first availability as done', () => {
    const steps = buildOnboardingSteps(facts({ petCount: 1, availabilityCount: 1 }));
    expect(steps[2]!.done).toBe(true);
    expect(steps[3]!.done).toBe(true);
  });
});

describe('firstOpenStepIndex', () => {
  it('always opens with the overview', () => {
    expect(firstOpenStepIndex(buildOnboardingSteps(EMPTY))).toBe(0);
    expect(
      firstOpenStepIndex(
        buildOnboardingSteps(
          facts({ displayName: 'König', hasAddress: true, petCount: 1, availabilityCount: 1 })
        )
      )
    ).toBe(0);
  });
});

describe('firstOpenTaskIndex', () => {
  it('starts with the profile when nothing is set up', () => {
    expect(firstOpenTaskIndex(buildOnboardingSteps(EMPTY))).toBe(1);
  });

  it('continues with the pets when the profile is done', () => {
    const steps = buildOnboardingSteps(facts({ displayName: 'König', hasAddress: true }));
    expect(firstOpenTaskIndex(steps)).toBe(2);
  });

  it('stays on the helper step when only the optional part is left', () => {
    const steps = buildOnboardingSteps(
      facts({ displayName: 'König', hasAddress: true, petCount: 2 })
    );
    expect(firstOpenTaskIndex(steps)).toBe(3);
  });

  it('falls back to the last step when everything is done', () => {
    const steps = buildOnboardingSteps(
      facts({ displayName: 'König', hasAddress: true, petCount: 1, availabilityCount: 2 })
    );
    expect(firstOpenTaskIndex(steps)).toBe(3);
  });
});

describe('onboardingComplete', () => {
  it('ignores the optional overview and helper step', () => {
    const steps = buildOnboardingSteps(
      facts({ displayName: 'König', hasAddress: true, petCount: 1 })
    );
    expect(onboardingComplete(steps)).toBe(true);
  });

  it('is false while a pet profile is missing', () => {
    const steps = buildOnboardingSteps(facts({ displayName: 'König', hasAddress: true }));
    expect(onboardingComplete(steps)).toBe(false);
  });
});

describe('completedStepCount', () => {
  it('counts finished steps for the progress indicator', () => {
    const steps = buildOnboardingSteps(facts({ displayName: 'König', hasAddress: true }));
    expect(completedStepCount(steps)).toBe(2);
  });
});
