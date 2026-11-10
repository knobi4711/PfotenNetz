import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HAZARD_RADAR_RADIUS_KM,
  DEFAULT_HELPER_MAX_DISTANCE_KM,
  DEFAULT_KIEZ_RADIUS,
  DEFAULT_TRACKING_RADIUS_M,
  HAZARD_RADAR_RADII,
  HAZARD_WARNING_RADIUS_KM,
  hazardWarningRadiusKm,
  KIEZ_RADIUS_OPTIONS,
  MAX_HAZARD_RADAR_RADIUS_KM,
  MAX_HAZARD_WARNING_RADIUS_KM,
  MAX_HELPER_DISTANCE_KM,
  MAX_HELPER_SEARCH_RADIUS_KM,
  MAX_MISSING_PET_SEARCH_RADIUS_KM,
  MAX_TRACKING_RADIUS_M,
  maxDistanceForBookingType,
  MIN_HAZARD_RADAR_RADIUS_KM,
  MIN_HELPER_SEARCH_RADIUS_KM,
  MIN_TRACKING_RADIUS_M,
  MISSING_PET_SEARCH_RADIUS_KM,
  TRACKING_RADIUS_OPTIONS,
} from './geo';

describe('geo constants', () => {
  it('keeps every default inside its selectable range', () => {
    expect(KIEZ_RADIUS_OPTIONS).toContain(DEFAULT_KIEZ_RADIUS);
    expect(HAZARD_RADAR_RADII).toContain(DEFAULT_HAZARD_RADAR_RADIUS_KM);
    expect(TRACKING_RADIUS_OPTIONS).toContain(DEFAULT_TRACKING_RADIUS_M);
  });

  it('keeps every selectable radius inside its server limit', () => {
    for (const radius of HAZARD_RADAR_RADII) {
      expect(radius).toBeGreaterThanOrEqual(MIN_HAZARD_RADAR_RADIUS_KM);
      expect(radius).toBeLessThanOrEqual(MAX_HAZARD_RADAR_RADIUS_KM);
    }
    for (const radius of TRACKING_RADIUS_OPTIONS) {
      expect(radius).toBeGreaterThanOrEqual(MIN_TRACKING_RADIUS_M);
      expect(radius).toBeLessThanOrEqual(MAX_TRACKING_RADIUS_M);
    }
  });

  it('keeps warning and travel radii inside their limits', () => {
    expect(HAZARD_WARNING_RADIUS_KM.default).toBeLessThan(HAZARD_WARNING_RADIUS_KM.critical);
    expect(HAZARD_WARNING_RADIUS_KM.critical).toBeLessThanOrEqual(MAX_HAZARD_WARNING_RADIUS_KM);
    expect(DEFAULT_HELPER_MAX_DISTANCE_KM).toBeLessThanOrEqual(MAX_HELPER_DISTANCE_KM);
    expect(MAX_HELPER_DISTANCE_KM).toBeLessThanOrEqual(MAX_HELPER_SEARCH_RADIUS_KM);
    expect(MAX_HELPER_DISTANCE_KM).toBeGreaterThan(MIN_HELPER_SEARCH_RADIUS_KM);
    expect(MISSING_PET_SEARCH_RADIUS_KM).toBeLessThanOrEqual(MAX_MISSING_PET_SEARCH_RADIUS_KM);
  });

  it('derives the warning radius from the severity', () => {
    expect(hazardWarningRadiusKm('critical')).toBe(HAZARD_WARNING_RADIUS_KM.critical);
    expect(hazardWarningRadiusKm('high')).toBe(HAZARD_WARNING_RADIUS_KM.default);
    expect(hazardWarningRadiusKm('low')).toBe(HAZARD_WARNING_RADIUS_KM.default);
  });

  it('picks the largest travel radius for a booking type', () => {
    const slots = [
      { booking_types: ['walk'], max_distance_km: 3 },
      { booking_types: ['walk', 'feeding'], max_distance_km: 8 },
      { booking_types: ['daycare'], max_distance_km: 50 },
    ];
    expect(maxDistanceForBookingType(slots, 'walk')).toBe(8);
    expect(maxDistanceForBookingType(slots, 'feeding')).toBe(8);
    expect(maxDistanceForBookingType(slots, 'daycare')).toBe(50);
    expect(maxDistanceForBookingType(slots, 'ride')).toBeNull();
  });
});
