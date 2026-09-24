export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export function buildOpenStreetMapSearchUrl(query: string): string {
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
    q: query.trim(),
  });
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

export async function searchOpenStreetMap(query: string): Promise<GeocodingResult[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) return [];

  const response = await fetch(buildOpenStreetMapSearchUrl(normalizedQuery), {
    headers: { Accept: 'application/json', 'Accept-Language': 'de' },
  });
  if (!response.ok) throw new Error('Ort konnte nicht gesucht werden.');

  const results = (await response.json()) as NominatimResult[];
  return results.flatMap((result) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{ latitude, longitude, displayName: result.display_name }];
  });
}
