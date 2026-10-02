import { File, Paths } from 'expo-file-system';

export type QueuedTrackingPoint = {
  session_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  speed_mps: number | null;
  heading_degrees: number | null;
  altitude_meters: number | null;
  recorded_at: string;
  is_batched: boolean;
};

const queueFile = new File(Paths.document, 'pfotennetz-tracking-points.json');

export async function readTrackingQueue(): Promise<QueuedTrackingPoint[]> {
  if (!queueFile.exists) return [];
  try {
    const parsed: unknown = JSON.parse(await queueFile.text());
    if (!Array.isArray(parsed)) return [];
    return parsed as QueuedTrackingPoint[];
  } catch {
    return [];
  }
}

export async function writeTrackingQueue(points: QueuedTrackingPoint[]): Promise<void> {
  if (points.length === 0) {
    if (queueFile.exists) queueFile.delete();
    return;
  }
  if (!queueFile.exists) queueFile.create({ intermediates: true });
  queueFile.write(JSON.stringify(points));
}

export async function appendTrackingQueue(points: QueuedTrackingPoint[]): Promise<void> {
  if (points.length === 0) return;
  const queued = await readTrackingQueue();
  await writeTrackingQueue([...queued, ...points]);
}
