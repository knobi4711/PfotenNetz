import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { profileKeys } from './keys';
import {
  fetchOwnProfile,
  updateOwnProfile,
  type Profile,
  type UpdateOwnProfileInput,
} from './queries';

/** The caller's own profile. */
export function useOwnProfile(): UseQueryResult<Profile | null, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: profileKeys.own,
    queryFn: () => fetchOwnProfile(client),
  });
}

/** Updates the caller's own editable profile fields. */
export function useUpdateOwnProfile() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOwnProfileInput) => updateOwnProfile(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.own });
    },
  });
}
