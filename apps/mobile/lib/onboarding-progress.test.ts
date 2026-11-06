import { describe, expect, it } from 'vitest';
import {
  buildOnboardingSteps,
  completedStepCount,
  firstOpenStepIndex,
  onboardingComplete,
  type OnboardingFacts,
} from './onboarding-progress';

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
  it('keeps the fixed order profile, pets, helper', () => {
    expect(buildOnboardingSteps(EMPTY).map((step) => step.id)).toEqual([
      'profile',
      'pets',
      'helper',
    ]);
  });

  it('marks the helper profile as optional', () => {
    const steps = buildOnboardingSteps(EMPTY);
    expect(steps.map((step) => step.optional)).toEqual([false, false, true]);
  });

  it('asks for the address first when the profile has no location yet', () => {
    const profile = buildOnboardingSteps(facts({ displayName: 'König' }))[0]!;
    expect(profile.done).toBe(false);
    expect(profile.target).toBe('profile-address');
    expect(profile.actionLabel).toBe('Adresse festlegen');
  });

  it('offers the profile form once an address exists', () => {
    const profile = buildOnboardingSteps(facts({ displayName: 'König', hasAddress: true }))[0]!;
    expect(profile.done).toBe(true);
    expect(profile.target).toBe('profile-edit');
  });

  it('requires a real display name next to the address', () => {
    const profile = buildOnboardingSteps(facts({ displayName: ' K ', hasAddress: true }))[0]!;
    expect(profile.done).toBe(false);
  });

  it('treats the first pet and the first availability as done', () => {
    const steps = buildOnboardingSteps(facts({ petCount: 1, availabilityCount: 1 }));
    expect(steps[1]!.done).toBe(true);
    expect(steps[2]!.done).toBe(true);
  });
});

describe('firstOpenStepIndex', () => {
  it('starts with the profile when nothing is set up', () => {
    expect(firstOpenStepIndex(buildOnboardingSteps(EMPTY))).toBe(0);
  });

  it('continues with the pets when the profile is done', () => {
    const steps = buildOnboardingSteps(facts({ displayName: 'König', hasAddress: true }));
    expect(firstOpenStepIndex(steps)).toBe(1);
  });

  it('stays on the helper step when only the optional part is left', () => {
    const steps = buildOnboardingSteps(
      facts({ displayName: 'König', hasAddress: true, petCount: 2 })
    );
    expect(firstOpenStepIndex(steps)).toBe(2);
  });

  it('falls back to the last step when everything is done', () => {
    const steps = buildOnboardingSteps(
      facts({ displayName: 'König', hasAddress: true, petCount: 1, availabilityCount: 2 })
    );
    expect(firstOpenStepIndex(steps)).toBe(2);
  });
});

describe('onboardingComplete', () => {
  it('ignores the optional helper step', () => {
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
    expect(completedStepCount(steps)).toBe(1);
  });
});
