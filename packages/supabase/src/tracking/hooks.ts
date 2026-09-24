import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { trackingKeys } from './keys';
import {
  createTrackingSession,
  fetchActiveTrackingSessions,
  fetchTrackingPoints,
  finishTrackingSession,
  insertTrackingPoints,
  subscribeTracking,
} from './queries';

export function useActiveTrackingSessions() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: trackingKeys.active,
    queryFn: () => fetchActiveTrackingSessions(client),
  });
}

export function useTrackingPoints(sessionId: string | null) {
  const client = getSupabaseClient();
  return useQuery({
    queryKey:
      sessionId === null
        ? [...trackingKeys.all, 'points-disabled']
        : trackingKeys.points(sessionId),
    queryFn: () => fetchTrackingPoints(client, sessionId as string),
    enabled: sessionId !== null,
  });
}

export function useTrackingSubscription() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeTracking(getSupabaseClient(), () => {
        void queryClient.invalidateQueries({ queryKey: trackingKeys.all });
      }),
    [queryClient]
  );
}

export function useCreateTrackingSession() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => createTrackingSession(client, bookingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trackingKeys.all }),
  });
}

export function useInsertTrackingPoints() {
  const client = getSupabaseClient();
  return useMutation({
    mutationFn: (input: {
      sessionId: string;
      point: {
        latitude: number;
        longitude: number;
        accuracy: number;
        speed?: number;
        heading?: number;
        altitude?: number;
        timestamp: number;
      };
    }) => insertTrackingPoints(client, input.sessionId, [input.point]),
  });
}

export function useFinishTrackingSession() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sessionId: string; distanceMeters: number; durationSeconds: number }) =>
      finishTrackingSession(client, input.sessionId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trackingKeys.all }),
  });
}
