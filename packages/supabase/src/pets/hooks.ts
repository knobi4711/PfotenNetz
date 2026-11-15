import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { petsKeys } from './keys';
import { fetchOwnEmergencyCardLinks, revokeEmergencyCardLink } from './emergencyLinks';
import {
  createPet,
  fetchOwnPets,
  fetchPetsByIds,
  setPetActive,
  setPetDeceased,
  uploadPetPhoto,
  updatePet,
  type CreatePetInput,
  type Pet,
  type UpdatePetInput,
} from './queries';

/** The caller's own pets, newest first. */
export function useOwnPets(): UseQueryResult<Pet[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: petsKeys.own,
    queryFn: () => fetchOwnPets(client),
  });
}

/**
 * Pets by id. Used by helpers to load the animals of a booking; RLS only
 * returns rows the caller is allowed to see.
 */
export function usePetsByIds(petIds: readonly string[]): UseQueryResult<Pet[], Error> {
  const client = getSupabaseClient();
  const ids = [...new Set(petIds)].sort();
  return useQuery({
    queryKey: petsKeys.byIds(ids),
    queryFn: () => fetchPetsByIds(client, ids),
    enabled: ids.length > 0,
    // Medical data is safety-critical, so always fetch a fresh copy on mount.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useOwnEmergencyCardLinks() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: petsKeys.emergencyLinks,
    queryFn: () => fetchOwnEmergencyCardLinks(client),
  });
}

export function useRevokeEmergencyCardLink() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => revokeEmergencyCardLink(client, linkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.emergencyLinks });
    },
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

/** Updates one of the caller's own pets. */
export function useUpdatePet() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePetInput) => updatePet(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.own });
    },
  });
}

/** Uploads or replaces one of the caller's pet photos. */
export function useUploadPetPhoto() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { petId: string; fileData: ArrayBuffer; contentType?: string }) =>
      uploadPetPhoto(client, input.petId, input.fileData, input.contentType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.own });
      void queryClient.refetchQueries({ queryKey: petsKeys.own, type: 'active' });
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

/** Marks one of the caller's own pets as deceased or living. */
export function useSetPetDeceased() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { petId: string; isDeceased: boolean }) =>
      setPetDeceased(client, input.petId, input.isDeceased),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.own });
    },
  });
}
