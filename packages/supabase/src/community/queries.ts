import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type CommunityEvent = Database['public']['Tables']['community_events']['Row'];
export type EventParticipant = Database['public']['Tables']['event_participants']['Row'];
export type CommunityEventType = Database['public']['Enums']['event_type'];
export type CommunityParticipantProfile = Pick<
  Database['public']['Views']['public_profiles']['Row'],
  'id' | 'display_name' | 'avatar_url'
>;

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

/** Admin-only queue; RLS rejects non-admin callers. */
export async function fetchCommunityModerationEvents(
  client: SupabaseClient<Database>
): Promise<CommunityEvent[]> {
  const { data, error } = await client
    .from('community_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function moderateCommunityEvent(
  client: SupabaseClient<Database>,
  eventId: string,
  isPublic: boolean
): Promise<CommunityEvent> {
  const { data, error } = await client
    .from('community_events')
    .update({ is_public: isPublic })
    .eq('id', eventId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOwnEventParticipants(
  client: SupabaseClient<Database>
): Promise<EventParticipant[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client.from('event_participants').select('*').eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchParticipantsForEvents(
  client: SupabaseClient<Database>,
  eventIds: string[]
): Promise<EventParticipant[]> {
  if (eventIds.length === 0) return [];
  const { data, error } = await client
    .from('event_participants')
    .select('*')
    .in('event_id', eventIds)
    .eq('status', 'going');
  if (error) throw error;
  return data ?? [];
}

export async function fetchParticipantProfilesForEvents(
  client: SupabaseClient<Database>,
  eventIds: string[]
): Promise<Record<string, CommunityParticipantProfile[]>> {
  const participants = await fetchParticipantsForEvents(client, eventIds);
  const ids = [...new Set(participants.map((participant) => participant.user_id))];
  if (ids.length === 0) return {};
  const { data, error } = await client
    .from('public_profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids);
  if (error) throw error;
  const profiles = new Map(
    (data ?? []).filter((profile) => profile.id).map((profile) => [profile.id as string, profile])
  );
  return participants.reduce<Record<string, CommunityParticipantProfile[]>>(
    (result, participant) => {
      const profile = profiles.get(participant.user_id);
      if (profile)
        result[participant.event_id] = [...(result[participant.event_id] ?? []), profile];
      return result;
    },
    {}
  );
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

export async function createCommunityEvent(
  client: SupabaseClient<Database>,
  input: {
    title: string;
    type: CommunityEventType;
    description?: string;
    address?: string;
    startsAt: string;
    endsAt?: string;
    maxParticipants?: number;
    latitude: number;
    longitude: number;
  }
): Promise<CommunityEvent> {
  const organizerId = await requireUserId(client);
  const { data, error } = await client
    .from('community_events')
    .insert({
      title: input.title,
      type: input.type,
      description: input.description || null,
      address: input.address || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      max_participants: input.maxParticipants ?? null,
      organizer_id: organizerId,
      location: `POINT(${input.longitude} ${input.latitude})`,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
