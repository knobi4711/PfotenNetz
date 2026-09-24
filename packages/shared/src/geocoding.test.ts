import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOpenStreetMapSearchUrl, searchOpenStreetMap } from './geocoding';

describe('OpenStreetMap geocoding', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a Nominatim search URL', () => {
    const url = buildOpenStreetMapSearchUrl('Leipzig, Markt');
    expect(url).toContain('https://nominatim.openstreetmap.org/search?');
    expect(url).toContain('q=Leipzig%2C+Markt');
    expect(url).toContain('format=jsonv2');
  });

  it('normalizes valid results and ignores invalid coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { lat: '51.33962', lon: '12.37129', display_name: 'Leipzig, Deutschland' },
          { lat: 'not-a-number', lon: '12.3', display_name: 'Ungültig' },
        ],
      })
    );

    await expect(searchOpenStreetMap('Leipzig')).resolves.toEqual([
      {
        latitude: 51.33962,
        longitude: 12.37129,
        displayName: 'Leipzig, Deutschland',
      },
    ]);
  });
});
