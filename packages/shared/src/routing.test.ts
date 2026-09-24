import { describe, expect, it, vi } from 'vitest';
import { buildOsrmWalkingRouteUrl, fetchOsrmWalkingRoute } from './routing';

describe('OSRM walking routes', () => {
  const points = [
    { latitude: 52.52, longitude: 13.405 },
    { latitude: 52.521, longitude: 13.406 },
  ];

  it('builds a foot-routing URL in longitude/latitude order', () => {
    expect(buildOsrmWalkingRouteUrl(points)).toBe(
      'https://router.project-osrm.org/route/v1/foot/13.405,52.52;13.406,52.521?overview=full&geometries=geojson'
    );
    expect(buildOsrmWalkingRouteUrl([points[0]!])).toBeNull();
  });

  it('converts OSRM GeoJSON coordinates to latitude/longitude points', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'Ok',
            routes: [
              {
                geometry: {
                  coordinates: [
                    [13.405, 52.52],
                    [13.4055, 52.5205],
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    await expect(fetchOsrmWalkingRoute(points)).resolves.toEqual([
      { latitude: 52.52, longitude: 13.405 },
      { latitude: 52.5205, longitude: 13.4055 },
    ]);
    vi.unstubAllGlobals();
  });
});
