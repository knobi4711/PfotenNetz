import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { missingPetKeys } from './keys';
import {
  createMissingPet,
  fetchNearbyMissingPets,
  fetchOwnMissingPets,
  fetchMissingPetSightings,
  createMissingPetSighting,
  uploadMissingPetSightingPhoto,
  markMissingPetFound,
} from './queries';

export function useOwnMissingPets() {
  const client = getSupabaseClient();
  return useQuery({ queryKey: missingPetKeys.own, queryFn: () => fetchOwnMissingPets(client) });
}
export function useNearbyMissingPets() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: [...missingPetKeys.all, 'nearby'],
    queryFn: () => fetchNearbyMissingPets(client),
  });
}
export function useCreateMissingPet() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      petId: string;
      latitude: number;
      longitude: number;
      description: string;
      lastSeenAt: string;
      radiusKm: number;
    }) => createMissingPet(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: missingPetKeys.all }),
  });
}
export function useMarkMissingPetFound() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missingPetId: string) => markMissingPetFound(client, missingPetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: missingPetKeys.all }),
  });
}

export function useMissingPetSightings(missingPetId: string | undefined) {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: [...missingPetKeys.all, 'sightings', missingPetId ?? 'unknown'],
    queryFn: () => fetchMissingPetSightings(client, missingPetId as string),
    enabled: missingPetId !== undefined,
  });
}

export function useCreateMissingPetSighting() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createMissingPetSighting>[1]) =>
      createMissingPetSighting(client, input),
    onSuccess: (_sighting, input) =>
      queryClient.invalidateQueries({
        queryKey: [...missingPetKeys.all, 'sightings', input.missingPetId],
      }),
  });
}

export function useUploadMissingPetSightingPhoto() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sightingId: string; fileData: ArrayBuffer; contentType?: string }) =>
      uploadMissingPetSightingPhoto(client, input.sightingId, input.fileData, input.contentType),
    onSuccess: (sighting) =>
      queryClient.invalidateQueries({
        queryKey: [...missingPetKeys.all, 'sightings', sighting.missing_pet_id],
      }),
  });
}
