import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { hazardKeys } from './keys';
import {
  createHazard,
  createHazardSighting,
  fetchActiveHazards,
  fetchHazard,
  fetchOwnHazards,
  fetchModerationHazards,
  moderateHazard,
  subscribeHazards,
  uploadHazardPhoto,
  type ActiveHazard,
  type Hazard,
  type HazardSeverity,
  type HazardType,
} from './queries';

export function useActiveHazards(
  search: { latitude: number; longitude: number; radiusKm: number } | null
): UseQueryResult<ActiveHazard[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey:
      search === null
        ? [...hazardKeys.all, 'disabled']
        : hazardKeys.active(search.latitude, search.longitude, search.radiusKm),
    queryFn: () => {
      if (search === null) throw new Error('Standort ist erforderlich.');
      return fetchActiveHazards(client, search);
    },
    enabled: search !== null,
  });
}

export function useHazard(hazardId: string | null): UseQueryResult<Hazard, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey:
      hazardId === null ? [...hazardKeys.all, 'detail', 'disabled'] : hazardKeys.detail(hazardId),
    queryFn: () => {
      if (hazardId === null) throw new Error('Gefahren-ID fehlt.');
      return fetchHazard(client, hazardId);
    },
    enabled: hazardId !== null,
  });
}

export function useOwnHazards(): UseQueryResult<Hazard[], Error> {
  const client = getSupabaseClient();
  return useQuery({ queryKey: hazardKeys.own, queryFn: () => fetchOwnHazards(client) });
}

export function useModerationHazards(): UseQueryResult<Hazard[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: [...hazardKeys.all, 'moderation'],
    queryFn: () => fetchModerationHazards(client),
  });
}

export function useModerateHazard() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      hazardId: string;
      status: 'active' | 'rejected' | 'resolved';
      resolutionNotes: string | null;
    }) => moderateHazard(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hazardKeys.all }),
  });
}

export function useHazardSubscription(): void {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeHazards(getSupabaseClient(), () => {
        void queryClient.invalidateQueries({ queryKey: hazardKeys.all });
      }),
    [queryClient]
  );
}

export function useCreateHazard() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: HazardType;
      severity: HazardSeverity;
      latitude: number;
      longitude: number;
      radiusKm: number;
      address: string | null;
      description: string;
    }) => createHazard(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hazardKeys.all }),
  });
}

export function useUploadHazardPhoto() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { hazardId: string; fileData: ArrayBuffer; contentType?: string }) =>
      uploadHazardPhoto(client, input.hazardId, input.fileData, input.contentType),
    onSuccess: (hazard) => queryClient.setQueryData(hazardKeys.detail(hazard.id), hazard),
  });
}

export function useCreateHazardSighting() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      hazardId: string;
      latitude: number;
      longitude: number;
      description: string;
    }) => createHazardSighting(client, input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: hazardKeys.detail(input.hazardId) }),
  });
}
