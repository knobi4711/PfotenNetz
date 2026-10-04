export const TRACKING_LOCATION_TASK = 'pfotennetz-tracking-location';

export async function startBackgroundTracking(_sessionId: string): Promise<void> {
  throw new Error('Hintergrund-Tracking wird im Browser nicht unterstützt.');
}

export async function stopBackgroundTracking(): Promise<void> {
  return undefined;
}
