export interface RoutingPoint {
  latitude: number;
  longitude: number;
}

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
}

export function buildOsrmWalkingRouteUrl(points: RoutingPoint[]): string | null {
  if (points.length < 2) return null;
  const coordinates = points
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(';');
  if (coordinates.split(';').length < 2) return null;
  return `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson`;
}

/** Returns an OSRM route in Leaflet's latitude/longitude order. */
export async function fetchOsrmWalkingRoute(points: RoutingPoint[]): Promise<RoutingPoint[]> {
  const url = buildOsrmWalkingRouteUrl(points);
  if (url === null) return [];

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Die Gehroute konnte nicht berechnet werden.');
  const result = (await response.json()) as OsrmRouteResponse;
  const coordinates = result.routes?.[0]?.geometry?.coordinates ?? [];
  if (result.code !== 'Ok' || coordinates.length < 2) return [];
  return coordinates.flatMap(([longitude, latitude]) =>
    Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ latitude, longitude }] : []
  );
}
