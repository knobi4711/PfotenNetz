import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type TrackingSession = Database['public']['Tables']['tracking_sessions']['Row'];
export type TrackingPoint = Database['public']['Tables']['tracking_points']['Row'];

export async function fetchActiveTrackingSessions(
  client: SupabaseClient<Database>
): Promise<TrackingSession[]> {
  const { data, error } = await client
    .from('tracking_sessions')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrackingPoints(
  client: SupabaseClient<Database>,
  sessionId: string
): Promise<TrackingPoint[]> {
  const { data, error } = await client
    .from('tracking_points')
    .select('*')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTrackingSession(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<TrackingSession> {
  const { data, error } = await client
    .from('tracking_sessions')
    .insert({ booking_id: bookingId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function insertTrackingPoints(
  client: SupabaseClient<Database>,
  sessionId: string,
  points: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    altitude?: number;
    timestamp: number;
  }>
): Promise<void> {
  if (points.length === 0) return;
  const { error } = await client.from('tracking_points').insert(
    points.map((point) => ({
      session_id: sessionId,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy_meters: point.accuracy,
      speed_mps: point.speed ?? null,
      heading_degrees: point.heading === undefined ? null : Math.round(point.heading),
      altitude_meters: point.altitude ?? null,
      recorded_at: new Date(point.timestamp).toISOString(),
      is_batched: points.length > 1,
    }))
  );
  if (error) throw error;
}

export async function finishTrackingSession(
  client: SupabaseClient<Database>,
  sessionId: string,
  totals: { distanceMeters: number; durationSeconds: number }
): Promise<void> {
  const { error } = await client
    .from('tracking_sessions')
    .update({
      ended_at: new Date().toISOString(),
      total_distance_meters: Math.max(0, Math.round(totals.distanceMeters)),
      total_duration_seconds: Math.max(0, Math.round(totals.durationSeconds)),
    })
    .eq('id', sessionId);
  if (error) throw error;
}

export function subscribeTracking(
  client: SupabaseClient<Database>,
  onChange: () => void
): () => void {
  const channel = client
    .channel('tracking-sessions-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_sessions' }, onChange)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tracking_points' },
      onChange
    )
    .subscribe();
  return () => void client.removeChannel(channel);
}
