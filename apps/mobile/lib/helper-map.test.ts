import { describe, expect, it } from 'vitest';
import { formatAvailableDays, projectNearbyPoint } from './helper-map';

describe('projectNearbyPoint', () => {
  const center = { latitude: 52.52, longitude: 13.405 };

  it('places the center in the middle', () => {
    expect(projectNearbyPoint(center, center, 3)).toEqual({ x: 50, y: 50 });
  });

  it('uses north-up orientation', () => {
    const north = projectNearbyPoint(center, { latitude: 52.53, longitude: 13.405 }, 3);
    const east = projectNearbyPoint(center, { latitude: 52.52, longitude: 13.415 }, 3);
    expect(north.y).toBeLessThan(50);
    expect(east.x).toBeGreaterThan(50);
  });

  it('clamps points to the visible overview', () => {
    expect(projectNearbyPoint(center, { latitude: 90, longitude: 180 }, 1)).toEqual({
      x: 95,
      y: 5,
    });
  });
});

describe('formatAvailableDays', () => {
  it('formats database weekday indexes for German UI', () => {
    expect(formatAvailableDays([0, 1, 3, 6])).toBe('So, Mo, Mi, Sa');
  });

  it('ignores invalid indexes', () => {
    expect(formatAvailableDays([-1, 7])).toBe('Keine aktiven Zeiten');
  });
});
