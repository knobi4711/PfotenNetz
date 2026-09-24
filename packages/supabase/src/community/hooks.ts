import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { communityKeys } from './keys';
import {
  fetchOwnEventParticipants,
  fetchParticipantsForEvents,
  fetchParticipantProfilesForEvents,
  fetchUpcomingCommunityEvents,
  createCommunityEvent,
  joinCommunityEvent,
  leaveCommunityEvent,
  fetchCommunityModerationEvents,
  moderateCommunityEvent,
} from './queries';

export function useUpcomingCommunityEvents() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: communityKeys.upcoming,
    queryFn: () => fetchUpcomingCommunityEvents(client),
  });
}

export function useOwnEventParticipants() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: [...communityKeys.all, 'participants'],
    queryFn: () => fetchOwnEventParticipants(client),
  });
}

export function useCommunityModerationEvents() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: [...communityKeys.all, 'moderation'],
    queryFn: () => fetchCommunityModerationEvents(client),
  });
}

export function useModerateCommunityEvent() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string; isPublic: boolean }) =>
      moderateCommunityEvent(client, input.eventId, input.isPublic),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export function useParticipantsForEvents(eventIds: string[]) {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: [...communityKeys.all, 'event-participants', ...eventIds],
    queryFn: () => fetchParticipantsForEvents(client, eventIds),
    enabled: eventIds.length > 0,
  });
}

export function useParticipantProfilesForEvents(eventIds: string[]) {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: [...communityKeys.all, 'participant-profiles', ...eventIds],
    queryFn: () => fetchParticipantProfilesForEvents(client, eventIds),
    enabled: eventIds.length > 0,
  });
}

export function useJoinCommunityEvent() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => joinCommunityEvent(client, eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export function useLeaveCommunityEvent() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => leaveCommunityEvent(client, eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export function useCreateCommunityEvent() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCommunityEvent>[1]) =>
      createCommunityEvent(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}
