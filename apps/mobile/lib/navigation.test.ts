import { describe, expect, it } from 'vitest';
import { buildDirectionsUrl } from './navigation-url';

describe('buildDirectionsUrl', () => {
  it('creates an encoded directions URL', () => {
    expect(buildDirectionsUrl('Mauerpark, Berlin')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Mauerpark%2C%20Berlin'
    );
  });

  it('rejects empty destinations', () => {
    expect(buildDirectionsUrl('   ')).toBeNull();
  });
});
