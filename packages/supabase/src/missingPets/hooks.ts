import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { missingPetKeys } from './keys';
import {
  createMissingPet,
  fetchNearbyMissingPets,
  fetchOwnMissingPets,
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
