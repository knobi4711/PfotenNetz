import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { marketplaceKeys } from './keys';
import {
  createMarketplaceInquiry,
  createMarketplaceListing,
  fetchMarketplaceListings,
  fetchOwnMarketplaceListings,
  setMarketplaceListingStatus,
} from './queries';

export function useMarketplaceListings(
  filters: Parameters<typeof fetchMarketplaceListings>[1] = {}
) {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: marketplaceKeys.listings(filters),
    queryFn: () => fetchMarketplaceListings(client, filters),
  });
}

export function useOwnMarketplaceListings() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: marketplaceKeys.own,
    queryFn: () => fetchOwnMarketplaceListings(client),
  });
}

export function useCreateMarketplaceListing() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createMarketplaceListing>[1]) =>
      createMarketplaceListing(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: marketplaceKeys.all }),
  });
}

export function useSetMarketplaceListingStatus() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      listingId: string;
      status: Parameters<typeof setMarketplaceListingStatus>[2];
    }) => setMarketplaceListingStatus(client, input.listingId, input.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: marketplaceKeys.all }),
  });
}

export function useCreateMarketplaceInquiry() {
  const client = getSupabaseClient();
  return useMutation({
    mutationFn: (input: { listingId: string; message: string }) =>
      createMarketplaceInquiry(client, input.listingId, input.message),
  });
}
