import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { communityKeys } from './keys';
import {
  fetchOwnEventParticipants,
  fetchUpcomingCommunityEvents,
  joinCommunityEvent,
  leaveCommunityEvent,
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
