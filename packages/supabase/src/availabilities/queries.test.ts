import { describe, expect, it } from 'vitest';
import {
  findAvailabilityOverlap,
  isBookingCoveredByAvailabilities,
  normalizeTime,
  planAvailabilityDays,
  validateAvailabilityInput,
} from './queries';

describe('availability validation', () => {
  it('normalizes HH:MM to HH:MM:SS', () => {
    expect(normalizeTime('09:30')).toBe('09:30:00');
    expect(normalizeTime('9:30')).toBeNull();
    expect(normalizeTime('25:00')).toBeNull();
    expect(normalizeTime('24:00')).toBe('24:00:00');
    expect(normalizeTime('24:30')).toBeNull();
  });

  it('rejects end before start and empty types', () => {
    expect(
      validateAvailabilityInput({
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '09:00',
        bookingTypes: ['walk'],
        maxDistanceKm: 5,
      })
    ).not.toBeNull();
    expect(
      validateAvailabilityInput({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        bookingTypes: [],
        maxDistanceKm: 5,
      })
    ).not.toBeNull();
    expect(
      validateAvailabilityInput({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        bookingTypes: ['walk'],
        maxDistanceKm: 5,
        petSpecies: ['dog'],
      })
    ).toBeNull();
  });

  it('only allows walking availability when dogs are accepted', () => {
    const base = {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '11:00',
      bookingTypes: ['walk'] as ('walk' | 'feeding' | 'vacation' | 'daycare' | 'ride')[],
      maxDistanceKm: 5,
    };

    expect(validateAvailabilityInput({ ...base, petSpecies: ['dog'] })).toBeNull();
    expect(validateAvailabilityInput({ ...base, petSpecies: ['cat'] })).toContain('nur für Hunde');
  });

  it('only allows riding availability when horses are accepted', () => {
    const base = {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '11:00',
      bookingTypes: ['ride'] as ('walk' | 'feeding' | 'vacation' | 'daycare' | 'ride')[],
      maxDistanceKm: 5,
    };

    expect(validateAvailabilityInput({ ...base, petSpecies: ['horse'] })).toBeNull();
    expect(validateAvailabilityInput({ ...base, petSpecies: ['dog'] })).toContain('nur für Pferde');
  });
});

describe('availability overlap', () => {
  const slots = [
    { id: 'a', day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
    { id: 'b', day_of_week: 1, start_time: '14:00:00', end_time: '16:00:00' },
    { id: 'c', day_of_week: 2, start_time: '09:00:00', end_time: '12:00:00' },
  ];

  it('detects overlaps on the same weekday', () => {
    expect(
      findAvailabilityOverlap(slots, {
        dayOfWeek: 1,
        startTime: '11:00',
        endTime: '13:00',
      })?.id
    ).toBe('a');
    expect(
      findAvailabilityOverlap(slots, {
        dayOfWeek: 1,
        startTime: '12:00',
        endTime: '14:00',
      })
    ).toBeUndefined();
    expect(
      findAvailabilityOverlap(slots, {
        dayOfWeek: 1,
        startTime: '12:30',
        endTime: '13:30',
      })
    ).toBeUndefined();
  });

  it('ignores the slot being edited and other weekdays', () => {
    expect(
      findAvailabilityOverlap(slots, { dayOfWeek: 1, startTime: '10:00', endTime: '13:00' }, 'a')
    ).toBeUndefined();
    expect(
      findAvailabilityOverlap(slots, {
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '12:00',
      })
    ).toBeUndefined();
  });
});

describe('availability multi-day planning', () => {
  const slots = [
    { id: 'mon', day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
    { id: 'tue-exact', day_of_week: 2, start_time: '09:00:00', end_time: '12:00:00' },
    { id: 'wed-blocked', day_of_week: 3, start_time: '10:00:00', end_time: '11:00:00' },
    { id: 'thu-other', day_of_week: 4, start_time: '14:00:00', end_time: '16:00:00' },
  ];
  const input = { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' };

  it('reuses exact matches instead of creating duplicates', () => {
    const plan = planAvailabilityDays(slots, input, [2]);
    expect(plan.reuse.map((slot) => slot.id)).toEqual(['tue-exact']);
    expect(plan.createDays).toEqual([]);
    expect(plan.conflicts).toEqual([]);
  });

  it('creates missing days and reports overlapping ones', () => {
    const plan = planAvailabilityDays(slots, input, [3, 5, 6]);
    expect(plan.createDays).toEqual([5, 6]);
    expect(plan.conflicts.map((entry) => entry.dayOfWeek)).toEqual([3]);
  });

  it('ignores the anchor day, duplicates and invalid weekdays', () => {
    const plan = planAvailabilityDays(slots, input, [1, 1, 2, 9, -1]);
    expect(plan.reuse.map((slot) => slot.id)).toEqual(['tue-exact']);
    expect(plan.createDays).toEqual([]);
    expect(plan.conflicts).toEqual([]);
  });

  it('copies a range that merely touches another slot', () => {
    const plan = planAvailabilityDays(slots, { ...input, endTime: '14:00' }, [4]);
    expect(plan.createDays).toEqual([4]);
    expect(plan.conflicts).toEqual([]);
  });
});

describe('availability coverage', () => {
  const slots = [
    {
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '12:00:00',
      booking_types: ['walk'],
      is_active: true,
    },
  ];
  it('covers a matching Monday walk in Berlin time', () => {
    // 2026-09-28 is a Monday.
    expect(
      isBookingCoveredByAvailabilities(slots, {
        startAt: '2026-09-28T10:00:00+02:00',
        endAt: '2026-09-28T11:00:00+02:00',
        type: 'walk',
      })
    ).toBe(true);
  });

  it('rejects wrong type and out-of-hours', () => {
    expect(
      isBookingCoveredByAvailabilities(slots, {
        startAt: '2026-09-28T10:00:00+02:00',
        endAt: '2026-09-28T11:00:00+02:00',
        type: 'feeding',
      })
    ).toBe(false);
    expect(
      isBookingCoveredByAvailabilities(slots, {
        startAt: '2026-09-28T11:30:00+02:00',
        endAt: '2026-09-28T12:30:00+02:00',
        type: 'walk',
      })
    ).toBe(false);
  });
});
