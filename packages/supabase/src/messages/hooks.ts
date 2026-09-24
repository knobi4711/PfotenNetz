import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { messageKeys } from './keys';
import {
  fetchBookingMessages,
  sendBookingMessage,
  uploadBookingMessageImage,
  uploadBookingMessageVoice,
} from './queries';

export function useBookingMessages(bookingId: string | undefined) {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: messageKeys.booking(bookingId ?? 'unknown'),
    queryFn: () => {
      if (bookingId === undefined) throw new Error('bookingId is required');
      return fetchBookingMessages(client, bookingId);
    },
    enabled: bookingId !== undefined,
  });
}

export function useSendBookingMessage() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; content: string }) =>
      sendBookingMessage(client, input.bookingId, input.content),
    onSuccess: (_message, input) => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.booking(input.bookingId) });
    },
  });
}

export function useUploadBookingMessageImage() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; fileData: ArrayBuffer; contentType?: string }) =>
      uploadBookingMessageImage(client, input.bookingId, input.fileData, input.contentType),
    onSuccess: (_message, input) =>
      queryClient.invalidateQueries({ queryKey: messageKeys.booking(input.bookingId) }),
  });
}

export function useUploadBookingMessageVoice() {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; fileData: ArrayBuffer; contentType?: string }) =>
      uploadBookingMessageVoice(client, input.bookingId, input.fileData, input.contentType),
    onSuccess: (_message, input) =>
      queryClient.invalidateQueries({ queryKey: messageKeys.booking(input.bookingId) }),
  });
}
