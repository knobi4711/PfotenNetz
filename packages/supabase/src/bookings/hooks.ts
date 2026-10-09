import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { bookingKeys } from './keys';
import { timebankKeys } from '../timebank/keys';
import {
  fetchBooking,
  fetchBookingGroup,
  fetchBookingsForUser,
  type Booking,
  type BookingWithRelations,
} from './queries';
import {
  acceptBooking,
  cancelBooking,
  completeBooking,
  rateHelper,
  rateSeeker,
  rejectBooking,
  startBooking,
} from './mutations';
import { createBooking, type CreateBookingInput } from './creation';

/**
 * Invalidates everything a booking mutation can change.
 * The UI must afterwards use only freshly re-fetched server values;
 * balances are never computed or carried forward locally.
 */
export function invalidateBookingQueries(queryClient: QueryClient, bookingId: string): void {
  void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
  void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
  void queryClient.invalidateQueries({ queryKey: timebankKeys.account });
  void queryClient.invalidateQueries({ queryKey: timebankKeys.transactions });
}

function invalidateGroupQuery(queryClient: QueryClient, booking: Booking): void {
  if (booking.booking_group_id !== null) {
    void queryClient.invalidateQueries({
      queryKey: bookingKeys.detail(`group:${booking.booking_group_id}`),
    });
  }
}

/** Booking detail with pet and participant display info. */
export function useBooking(
  bookingId: string | undefined
): UseQueryResult<BookingWithRelations, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: bookingKeys.detail(bookingId ?? 'unknown'),
    queryFn: () => {
      if (bookingId === undefined) throw new Error('bookingId is required');
      return fetchBooking(client, bookingId);
    },
    enabled: bookingId !== undefined,
  });
}

/** Other pet rows belonging to the same grouped request, if any. */
export function useBookingGroup(
  bookingGroupId: string | null | undefined
): UseQueryResult<BookingWithRelations[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: bookingKeys.detail(`group:${bookingGroupId ?? 'none'}`),
    queryFn: () => {
      if (bookingGroupId === undefined || bookingGroupId === null) {
        throw new Error('bookingGroupId is required');
      }
      return fetchBookingGroup(client, bookingGroupId);
    },
    enabled: bookingGroupId !== undefined && bookingGroupId !== null,
  });
}

/** The caller's bookings (RLS scopes to participations), newest first. */
export function useBookings(): UseQueryResult<BookingWithRelations[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: bookingKeys.list(),
    queryFn: () => fetchBookingsForUser(client),
  });
}

/** Accept a requested booking as the assigned helper. */
export function useAcceptBooking(): UseMutationResult<Booking, Error, string> {
  const client = getSupabaseClient();
  return useBookingMutationWithClient(client, acceptBooking);
}

function useBookingMutationWithClient(
  client: ReturnType<typeof getSupabaseClient>,
  mutationFn: (client: ReturnType<typeof getSupabaseClient>, bookingId: string) => Promise<Booking>
): UseMutationResult<Booking, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => mutationFn(client, bookingId),
    onSuccess: (booking, bookingId) => {
      invalidateBookingQueries(queryClient, bookingId);
      invalidateGroupQuery(queryClient, booking);
    },
  });
}

/** Start a confirmed booking as the assigned helper. */
export function useStartBooking(): UseMutationResult<Booking, Error, string> {
  const client = getSupabaseClient();
  return useBookingMutationWithClient(client, startBooking);
}

/** Complete an in-progress booking; server settles KIEZ_HOURS atomically. */
export function useCompleteBooking(): UseMutationResult<Booking, Error, string> {
  const client = getSupabaseClient();
  return useBookingMutationWithClient(client, completeBooking);
}

/** Reject a requested booking as the assigned helper. */
export function useRejectBooking(reason?: string): UseMutationResult<Booking, Error, string> {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => rejectBooking(client, bookingId, reason),
    onSuccess: (booking, bookingId) => {
      invalidateBookingQueries(queryClient, bookingId);
      invalidateGroupQuery(queryClient, booking);
    },
  });
}

/** Cancel a booking as the seeker. */
export function useCancelBooking(reason?: string): UseMutationResult<Booking, Error, string> {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => cancelBooking(client, bookingId, reason),
    onSuccess: (booking, bookingId) => {
      invalidateBookingQueries(queryClient, bookingId);
      invalidateGroupQuery(queryClient, booking);
    },
  });
}

export interface RateInput {
  bookingId: string;
  rating: number;
  review?: string;
}

/** Seeker rates the helper after completion. */
export function useRateHelper(): UseMutationResult<Booking, Error, RateInput> {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RateInput) =>
      rateHelper(client, input.bookingId, input.rating, input.review),
    onSuccess: (booking) => {
      invalidateBookingQueries(queryClient, booking.id);
      invalidateGroupQuery(queryClient, booking);
    },
  });
}

/** Helper rates the seeker after completion. */
export function useRateSeeker(): UseMutationResult<Booking, Error, RateInput> {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RateInput) =>
      rateSeeker(client, input.bookingId, input.rating, input.review),
    onSuccess: (booking) => {
      invalidateBookingQueries(queryClient, booking.id);
      invalidateGroupQuery(queryClient, booking);
    },
  });
}

/** Seeker creates a new requested booking for one of their own active pets. */
export function useCreateBooking(): UseMutationResult<Booking, Error, CreateBookingInput> {
  const client = getSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(client, input),
    onSuccess: (booking) => {
      invalidateBookingQueries(queryClient, booking.id);
    },
  });
}
