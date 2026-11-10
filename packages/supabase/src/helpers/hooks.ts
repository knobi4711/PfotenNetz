import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { helperKeys } from './keys';
import {
  fetchHelperDetail,
  fetchHelperSearchOrigin,
  fetchNearbyHelpers,
  type HelperDetail,
  type HelperSearchOrigin,
  type NearbyHelper,
  type NearbyHelperSearch,
} from './queries';

/** The caller's own Vermittlungsstandort for centering the neighbourhood map. */
export function useHelperSearchOrigin(): UseQueryResult<HelperSearchOrigin | null, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: helperKeys.origin,
    queryFn: () => fetchHelperSearchOrigin(client),
  });
}

export function useNearbyHelpers(
  search: NearbyHelperSearch | null
): UseQueryResult<NearbyHelper[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey:
      search === null ? [...helperKeys.all, 'nearby', 'disabled'] : helperKeys.nearby(search),
    queryFn: () => {
      if (search === null) throw new Error('Standort ist erforderlich.');
      return fetchNearbyHelpers(client, search);
    },
    enabled: search !== null,
  });
}

export function useHelperDetail(helperId: string | null): UseQueryResult<HelperDetail, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey:
      helperId === null ? [...helperKeys.all, 'detail', 'disabled'] : helperKeys.detail(helperId),
    queryFn: () => {
      if (helperId === null) throw new Error('Helper-ID fehlt.');
      return fetchHelperDetail(client, helperId);
    },
    enabled: helperId !== null,
  });
}
