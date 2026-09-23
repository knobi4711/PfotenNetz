import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type CommunityEvent = Database['public']['Tables']['community_events']['Row'];
export type EventParticipant = Database['public']['Tables']['event_participants']['Row'];

export const EVENT_TYPE_LABELS: Record<Database['public']['Enums']['event_type'], string> = {
  group_walk: 'Rudelrunde',
  playdate: 'Playdate',
  meetup: 'Treffen',
  swap_meet: 'Tauschbörse',
  training: 'Training',
  other: 'Community-Event',
};

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user === null) throw new Error('Not authenticated');
  return data.user.id;
}

export async function fetchUpcomingCommunityEvents(
  client: SupabaseClient<Database>
): Promise<CommunityEvent[]> {
  const { data, error } = await client
    .from('community_events')
    .select('*')
    .eq('is_public', true)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOwnEventParticipants(
  client: SupabaseClient<Database>
): Promise<EventParticipant[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client.from('event_participants').select('*').eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function joinCommunityEvent(
  client: SupabaseClient<Database>,
  eventId: string
): Promise<EventParticipant> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('event_participants')
    .upsert(
      { event_id: eventId, user_id: userId, status: 'going' },
      { onConflict: 'event_id,user_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function leaveCommunityEvent(
  client: SupabaseClient<Database>,
  eventId: string
): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
}
