import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { bookingTemplateKeys } from './keys';
import {
  deleteBookingTemplate,
  fetchBookingTemplates,
  saveBookingTemplate,
  type BookingTemplate,
  type SaveBookingTemplateInput,
} from './queries';

/** The caller's reusable booking templates, most recently used first. */
export function useBookingTemplates(): UseQueryResult<BookingTemplate[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: bookingTemplateKeys.own,
    queryFn: () => fetchBookingTemplates(client),
  });
}

/** Saves the current booking form values as a named template (upsert by name). */
export function useSaveBookingTemplate() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveBookingTemplateInput) => saveBookingTemplate(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingTemplateKeys.own });
    },
  });
}

/** Deletes one of the caller's own booking templates. */
export function useDeleteBookingTemplate() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => deleteBookingTemplate(client, templateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingTemplateKeys.own });
    },
  });
}
