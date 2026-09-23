import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { verificationKeys } from './keys';
import {
  fetchOwnVerifications,
  requestHelperStatus,
  updateOwnLocation,
  type Verification,
} from './queries';

export function useOwnVerifications(): UseQueryResult<Verification[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: verificationKeys.own,
    queryFn: () => fetchOwnVerifications(client),
  });
}

export function useRequestHelperStatus() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestHelperStatus(client),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: verificationKeys.own });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUpdateOwnLocation() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { latitude: number; longitude: number }) =>
      updateOwnLocation(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['helpers'] });
    },
  });
}
