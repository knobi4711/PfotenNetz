import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { availabilityKeys } from './keys';
import {
  createAvailability,
  deleteAvailability,
  fetchOwnAvailabilities,
  updateAvailability,
  type Availability,
  type UpsertAvailabilityInput,
} from './queries';

export function useOwnAvailabilities(): UseQueryResult<Availability[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: availabilityKeys.own,
    queryFn: () => fetchOwnAvailabilities(client),
  });
}

function useInvalidateOwn() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: availabilityKeys.own });
    void queryClient.invalidateQueries({ queryKey: ['helpers'] });
  };
}

export function useCreateAvailability() {
  const client = getSupabaseClient();
  const invalidate = useInvalidateOwn();
  return useMutation({
    mutationFn: (input: UpsertAvailabilityInput) => createAvailability(client, input),
    onSuccess: invalidate,
  });
}

export function useUpdateAvailability() {
  const client = getSupabaseClient();
  const invalidate = useInvalidateOwn();
  return useMutation({
    mutationFn: (args: { id: string; input: Partial<UpsertAvailabilityInput> }) =>
      updateAvailability(client, args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useDeleteAvailability() {
  const client = getSupabaseClient();
  const invalidate = useInvalidateOwn();
  return useMutation({
    mutationFn: (id: string) => deleteAvailability(client, id),
    onSuccess: invalidate,
  });
}
