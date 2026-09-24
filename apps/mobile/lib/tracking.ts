export type TrackingCoordinate = {
  latitude: number;
  longitude: number;
};

export function distanceMeters(a: TrackingCoordinate, b: TrackingCoordinate): number {
  const earth = 6371000;
  const lat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const lon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const value =
    Math.sin(lat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(lon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
