import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { statsKeys } from './keys';
import { fetchNearbyHelperCount, fetchRegisteredUserCount } from './queries';

/**
 * Number of registered profiles for the social proof on the dashboards.
 * The value changes slowly, so it is cached for five minutes.
 */
export function useRegisteredUserCount(): UseQueryResult<number, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: statsKeys.registeredUsers,
    queryFn: () => fetchRegisteredUserCount(client),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Number of verified helpers around the caller's stored neighbourhood location.
 * `null` means the profile has no location yet.
 */
export function useNearbyHelperCount(): UseQueryResult<number | null, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: statsKeys.nearbyHelpers,
    queryFn: () => fetchNearbyHelperCount(client),
    staleTime: 5 * 60 * 1000,
  });
}
