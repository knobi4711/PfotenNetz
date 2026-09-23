import { describe, expect, it } from 'vitest';
import {
  isBookingCoveredByAvailabilities,
  normalizeTime,
  validateAvailabilityInput,
} from './queries';

describe('availability validation', () => {
  it('normalizes HH:MM to HH:MM:SS', () => {
    expect(normalizeTime('09:30')).toBe('09:30:00');
    expect(normalizeTime('9:30')).toBeNull();
    expect(normalizeTime('25:00')).toBeNull();
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
      })
    ).toBeNull();
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
