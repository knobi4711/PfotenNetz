/**
 * Map tiles are served through a same-origin proxy so that ad blockers, DNS
 * filters, broken IPv6 routes and OpenStreetMap rate limits cannot leave the
 * map blank. The route handler lives in `app/api/map-tiles/[z]/[x]/[y]`.
 */
export const MAP_TILE_URL = '/api/map-tiles/{z}/{x}/{y}.png';

export const MAP_TILE_ATTRIBUTION = '© OpenStreetMap-Mitwirkende';
