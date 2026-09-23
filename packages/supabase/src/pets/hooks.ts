import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { petsKeys } from './keys';
import { createPet, fetchOwnPets, setPetActive, type CreatePetInput, type Pet } from './queries';

/** The caller's own pets, newest first. */
export function useOwnPets(): UseQueryResult<Pet[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: petsKeys.own,
    queryFn: () => fetchOwnPets(client),
  });
}

/** Creates a pet for the caller. */
export function useCreatePet() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePetInput) => createPet(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.own });
    },
  });
}

/** Activates or deactivates one of the caller's own pets. */
export function useSetPetActive() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { petId: string; isActive: boolean }) =>
      setPetActive(client, input.petId, input.isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.own });
    },
  });
}
