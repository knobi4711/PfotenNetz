import { NextResponse } from 'next/server';

const TILE_SOURCES = ['https://tile.openstreetmap.de', 'https://tile.openstreetmap.org'] as const;
const MAX_ZOOM = 19;
// OpenStreetMap requires a descriptive user agent for server-side requests.
const USER_AGENT = 'PfotenNetz/1.0 (+https://pfotennetz.app)';
const TILE_CACHE_SECONDS = 60 * 60 * 24;

export const revalidate = 86400;

function parseCoordinate(value: string, max: number): number | null {
  if (!/^\d{1,7}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed <= max ? parsed : null;
}

async function loadTile(path: string): Promise<Response | null> {
  for (const source of TILE_SOURCES) {
    try {
      const upstream = await fetch(`${source}/${path}.png`, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://pfotennetz.app/',
        },
        next: { revalidate: TILE_CACHE_SECONDS },
      });
      if (upstream.ok && upstream.body !== null) return upstream;
    } catch {
      // Try the next tile server instead of failing the whole map.
    }
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z: rawZoom, x: rawX, y: rawYWithExtension } = await params;
  const zoom = parseCoordinate(rawZoom, MAX_ZOOM);
  if (zoom === null) {
    return NextResponse.json({ error: 'Ungültige Zoomstufe.' }, { status: 400 });
  }
  const limit = 2 ** zoom - 1;
  const rawY = rawYWithExtension.endsWith('.png')
    ? rawYWithExtension.slice(0, -4)
    : rawYWithExtension;
  const x = parseCoordinate(rawX, limit);
  const y = parseCoordinate(rawY, limit);
  if (x === null || y === null) {
    return NextResponse.json({ error: 'Ungültige Kachelkoordinaten.' }, { status: 400 });
  }

  const tile = await loadTile(`${zoom}/${x}/${y}`);
  if (tile === null) {
    return NextResponse.json(
      { error: 'Kartenkachel konnte nicht geladen werden.' },
      { status: 502 }
    );
  }

  return new Response(tile.body, {
    headers: {
      'Content-Type': tile.headers.get('Content-Type') ?? 'image/png',
      'Cache-Control': `public, max-age=${TILE_CACHE_SECONDS}, stale-while-revalidate=${TILE_CACHE_SECONDS * 7}`,
    },
  });
}
