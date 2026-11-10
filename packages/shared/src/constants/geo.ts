/**
 * Zentrale Entfernungs- und Radiuswerte der App.
 *
 * Jeder Wert hat genau eine Bedeutung. Die SQL-Seite kann diese Konstanten
 * nicht importieren; die Grenzen sind dort gespiegelt und in den jeweiligen
 * Migrationen dokumentiert.
 */

/** Reichweite der Nachbarschaft: offene Anfragen, Umgebungs-Statistik und Suchstart. */
export const KIEZ_RADIUS_OPTIONS = [0.5, 1.0, 1.5, 3.0] as const;
export type KiezRadius = (typeof KIEZ_RADIUS_OPTIONS)[number];
export const DEFAULT_KIEZ_RADIUS: KiezRadius = 1.5;

/**
 * Server-Grenzen der Helfersuche.
 *
 * Die Helfersuche hat keinen frei wählbaren Radius mehr: Sichtbar ist, wessen
 * eigene Reisebereitschaft das Tier-Zuhause erreicht. Der obere
 * Server-Grenzwert entspricht deshalb der größten zulässigen Reisebereitschaft
 * (MAX_HELPER_DISTANCE_KM) und dient nur noch als Sicherheitsgrenze.
 */
export const MIN_HELPER_SEARCH_RADIUS_KM = 0.5;
export const MAX_HELPER_SEARCH_RADIUS_KM = 50;

/** Größte Reisebereitschaft unter den Slots, die eine Betreuungsart anbieten. */
export function maxDistanceForBookingType(
  slots: readonly { booking_types: readonly string[]; max_distance_km: number }[],
  bookingType: string
): number | null {
  let max: number | null = null;
  for (const slot of slots) {
    if (!slot.booking_types.includes(bookingType)) continue;
    const value = Number(slot.max_distance_km);
    if (!Number.isFinite(value)) continue;
    if (max === null || value > max) max = value;
  }
  return max;
}

/** Reisebereitschaft eines Helfers pro Verfügbarkeitsfenster (km). */
export const DEFAULT_HELPER_MAX_DISTANCE_KM = 5;
export const MAX_HELPER_DISTANCE_KM = 50;

/** Suchradius des Gefahren-Radars; der Server erlaubt 0,1 bis 10 km. */
export const HAZARD_RADAR_RADII = [0.5, 1, 1.5, 3] as const;
export type HazardRadarRadiusKm = (typeof HAZARD_RADAR_RADII)[number];
export const DEFAULT_HAZARD_RADAR_RADIUS_KM: HazardRadarRadiusKm = 1.5;
export const MIN_HAZARD_RADAR_RADIUS_KM = 0.1;
export const MAX_HAZARD_RADAR_RADIUS_KM = 10;

/** Warnradius einer Gefahrenmeldung (abhängig von der Schwere). */
export const HAZARD_WARNING_RADIUS_KM = {
  default: 0.5,
  critical: 1.5,
} as const;
export const MIN_HAZARD_WARNING_RADIUS_KM = 0.1;
export const MAX_HAZARD_WARNING_RADIUS_KM = 10;

/** Warnradius passend zur gemeldeten Schwere. */
export function hazardWarningRadiusKm(severity: string): number {
  return severity === 'critical'
    ? HAZARD_WARNING_RADIUS_KM.critical
    : HAZARD_WARNING_RADIUS_KM.default;
}

/** Suchradius einer Vermisst-Meldung. */
export const MISSING_PET_SEARCH_RADIUS_KM = 3;
export const MAX_MISSING_PET_SEARCH_RADIUS_KM = 50;

/** Sicherheitszone beim Live-Tracking (Meter). */
export const TRACKING_RADIUS_OPTIONS = [1000, 2000, 4000] as const;
export const DEFAULT_TRACKING_RADIUS_M = 1000;
export const MIN_TRACKING_RADIUS_M = 100;
export const MAX_TRACKING_RADIUS_M = 10000;
