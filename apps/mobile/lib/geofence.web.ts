export const TRACKING_GEOFENCE_TASK = 'pfotennetz-tracking-geofence';

export async function startTrackingGeofence(
  _bookingId: string,
  _center: { latitude: number; longitude: number },
  _radius = 500
): Promise<void> {
  throw new Error('Sicherheitszonen werden im Browser nicht unterstützt.');
}

export async function stopTrackingGeofence(): Promise<void> {
  return undefined;
}
