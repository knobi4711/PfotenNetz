import { useMutation, useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import {
  cancelContactRequest,
  createContactRequest,
  fetchOwnContactRequests,
  respondContactRequest,
  type CreateContactRequestInput,
} from './queries';

export function useOwnContactRequests() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: ['contact-requests', 'own'],
    queryFn: () => fetchOwnContactRequests(client),
  });
}

export function useCreateContactRequest() {
  const client = getSupabaseClient();
  return useMutation({
    mutationFn: (input: CreateContactRequestInput) => createContactRequest(client, input),
  });
}

export function useRespondContactRequest() {
  const client = getSupabaseClient();
  return useMutation({
    mutationFn: (input: { requestId: string; status: 'accepted' | 'declined' }) =>
      respondContactRequest(client, input.requestId, input.status),
  });
}

export function useCancelContactRequest() {
  const client = getSupabaseClient();
  return useMutation({
    mutationFn: (requestId: string) => cancelContactRequest(client, requestId),
  });
}
