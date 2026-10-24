import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildOpenStreetMapSearchUrl,
  reverseGeocodeOpenStreetMap,
  searchOpenStreetMap,
} from './geocoding';

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

  it('extracts a structured street address from the geocoding result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: '51.33962',
            lon: '12.37129',
            display_name: 'Musterstraße 12, 04109 Leipzig, Deutschland',
            address: {
              road: 'Musterstraße',
              house_number: '12',
              postcode: '04109',
              city: 'Leipzig',
            },
          },
        ],
      })
    );

    const [result] = await searchOpenStreetMap('Musterstraße 12, Leipzig');

    expect(result?.address).toEqual({
      street: 'Musterstraße 12',
      postalCode: '04109',
      city: 'Leipzig',
    });
  });

  it('prefers the village over the superordinate town for the city field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lat: '51.4',
          lon: '12.1',
          display_name: 'Gut Ermlitz, 10, Pestalozzistraße, Ermlitz, Schkopau, Deutschland',
          address: {
            road: 'Pestalozzistraße',
            house_number: '10',
            postcode: '06258',
            village: 'Ermlitz',
            town: 'Schkopau',
          },
        }),
      })
    );

    await expect(reverseGeocodeOpenStreetMap(51.4, 12.1)).resolves.toMatchObject({
      address: {
        street: 'Pestalozzistraße 10',
        postalCode: '06258',
        city: 'Ermlitz',
      },
    });
  });

  it('uses the village name when reverse geocoding a rural address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lat: '51.4',
          lon: '12.1',
          display_name: 'Dorfstraße 3, 06258 Ermlitz, Deutschland',
          address: {
            road: 'Dorfstraße',
            house_number: '3',
            postcode: '06258',
            village: 'Ermlitz',
            municipality: 'Schkopau',
          },
        }),
      })
    );

    await expect(reverseGeocodeOpenStreetMap(51.4, 12.1)).resolves.toEqual({
      latitude: 51.4,
      longitude: 12.1,
      displayName: 'Dorfstraße 3, 06258 Ermlitz, Deutschland',
      address: {
        street: 'Dorfstraße 3',
        postalCode: '06258',
        city: 'Ermlitz',
      },
    });
  });
});
