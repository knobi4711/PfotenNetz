export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapPoint {
  /** Percentage from the left edge, clamped to the visible map. */
  x: number;
  /** Percentage from the top edge, clamped to the visible map. */
  y: number;
}

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

export function formatAvailableDays(days: number[]): string {
  const labels = days
    .filter((day) => Number.isInteger(day) && day >= 0 && day < WEEKDAY_LABELS.length)
    .map((day) => WEEKDAY_LABELS[day]);
  return labels.length > 0 ? labels.join(', ') : 'Keine aktiven Zeiten';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Projects a nearby coordinate onto a small north-up neighborhood overview.
 * This is deliberately a schematic map: helper coordinates are already
 * rounded server-side and no third-party map/API key receives location data.
 */
export function projectNearbyPoint(
  center: MapCoordinate,
  point: MapCoordinate,
  radiusKm: number
): MapPoint {
  const latitudeKm = (point.latitude - center.latitude) * 111.32;
  const longitudeScale = Math.cos((center.latitude * Math.PI) / 180);
  const longitudeKm = (point.longitude - center.longitude) * 111.32 * longitudeScale;
  const safeRadius = Math.max(radiusKm, 0.5);
  return {
    x: clamp(50 + (longitudeKm / safeRadius) * 45, 5, 95),
    y: clamp(50 - (latitudeKm / safeRadius) * 45, 5, 95),
  };
}
