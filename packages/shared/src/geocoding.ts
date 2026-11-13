export interface GeocodingAddress {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  /**
   * Ortsname des Tier-Zuhauses: in Großstädten der Stadtteil, in Kleinstädten
   * der Stadtname und auf dem Land der Gemeindename.
   */
  place: string | null;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address?: GeocodingAddress;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  suburb?: string;
  city_district?: string;
  borough?: string;
  quarter?: string;
  neighbourhood?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

/**
 * Nominatim (OpenStreetMap) weist Anfragen mit generischen Bibliotheks-User-Agents
 * wie `okhttp/…` mit HTTP 403 ab. Im Browser ergänzt der Browser einen eigenen
 * User-Agent, in der Mobile-App (React Native) muss er explizit gesetzt werden.
 * Webbrowser ignorieren den Header, weil er dort nicht erlaubt ist.
 */
export const OPENSTREETMAP_USER_AGENT = 'PfotenNetz/1.0 (+https://pfotennetz.app)';

const OPENSTREETMAP_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Accept-Language': 'de',
  'User-Agent': OPENSTREETMAP_USER_AGENT,
};

function trimmed(value: string | undefined): string | null {
  return value?.trim() || null;
}

/**
 * Wählt den Ortsnamen fürs Tier-Zuhause nach der Siedlungsgröße:
 * - Land (`village`/`hamlet`): Gemeindename, sonst Ortschaft
 * - Kleinstadt (`town`): Stadtname
 * - Großstadt (`city` mit Stadtteil): Stadtteil
 */
function resolveHomePlace(address: NominatimAddress | undefined): string | null {
  if (!address) return null;

  const city = trimmed(address.city);
  const town = trimmed(address.town);
  const village = trimmed(address.village);
  const hamlet = trimmed(address.hamlet);
  const municipality = trimmed(address.municipality);
  const district =
    trimmed(address.suburb) ??
    trimmed(address.city_district) ??
    trimmed(address.borough) ??
    trimmed(address.quarter) ??
    trimmed(address.neighbourhood);

  if (village !== null || hamlet !== null) return municipality ?? town ?? village ?? hamlet;
  if (town !== null) return town;
  if (city !== null && district !== null) return district;
  return city ?? municipality ?? town ?? village ?? hamlet;
}

function parseGeocodingAddress(
  address: NominatimAddress | undefined
): GeocodingAddress | undefined {
  if (!address) return undefined;

  const road = address.road?.trim() ?? '';
  const houseNumber = address.house_number?.trim() ?? '';
  const street = road ? (houseNumber ? `${road} ${houseNumber}` : road) : null;
  const postalCode = address.postcode?.trim() || null;
  // Prefer the most specific locality: village before the superordinate town.
  const city =
    (address.city ?? address.village ?? address.town ?? address.municipality)?.trim() || null;
  const place = resolveHomePlace(address);

  if (!street && !postalCode && !city && !place) return undefined;
  return { street, postalCode, city, place };
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

export function buildOpenStreetMapReverseUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    lat: String(latitude),
    lon: String(longitude),
  });
  return `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
}

export async function searchOpenStreetMap(query: string): Promise<GeocodingResult[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) return [];

  const response = await fetch(buildOpenStreetMapSearchUrl(normalizedQuery), {
    headers: OPENSTREETMAP_HEADERS,
  });
  if (!response.ok) throw new Error('Ort konnte nicht gesucht werden.');

  const results = (await response.json()) as NominatimResult[];
  return results.flatMap((result) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const address = parseGeocodingAddress(result.address);
    return [
      {
        latitude,
        longitude,
        displayName: result.display_name,
        ...(address ? { address } : {}),
      },
    ];
  });
}

export async function reverseGeocodeOpenStreetMap(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  const response = await fetch(buildOpenStreetMapReverseUrl(latitude, longitude), {
    headers: OPENSTREETMAP_HEADERS,
  });
  if (!response.ok) throw new Error('Adresse zum Standort konnte nicht ermittelt werden.');

  const result = (await response.json()) as NominatimResult;
  const resultLatitude = Number(result.lat);
  const resultLongitude = Number(result.lon);
  if (!Number.isFinite(resultLatitude) || !Number.isFinite(resultLongitude)) {
    throw new Error('Adresse zum Standort konnte nicht ermittelt werden.');
  }
  const address = parseGeocodingAddress(result.address);
  return {
    latitude: resultLatitude,
    longitude: resultLongitude,
    displayName: result.display_name,
    ...(address ? { address } : {}),
  };
}
