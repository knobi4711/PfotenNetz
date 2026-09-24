import { describe, expect, it } from 'vitest';
import { QUICK_REPLIES } from './chat';
import { distanceMeters } from './tracking';

describe('mobile smoke flow contracts', () => {
  it('offers the German chat quick replies used by the mobile composer', () => {
    expect(QUICK_REPLIES).toEqual(['Danke! ❤️', 'Gibt es Probleme?', 'Wasser gegeben?']);
  });

  it('calculates zero distance for an unchanged tracking position', () => {
    expect(
      distanceMeters({ latitude: 52.52, longitude: 13.405 }, { latitude: 52.52, longitude: 13.405 })
    ).toBe(0);
  });

  it('calculates a realistic distance for consecutive GPS points', () => {
    const distance = distanceMeters(
      { latitude: 52.52, longitude: 13.405 },
      { latitude: 52.5209, longitude: 13.405 }
    );
    expect(distance).toBeGreaterThan(95);
    expect(distance).toBeLessThan(105);
  });
});
