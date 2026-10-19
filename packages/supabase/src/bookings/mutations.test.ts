import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import {
  acceptBooking,
  cancelBooking,
  completeBooking,
  rateHelper,
  rateSeeker,
  rejectBooking,
  startBooking,
  updateBookingRequest,
} from './mutations';

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

interface MutationMock {
  client: SupabaseClient<Database>;
  rpcCalls: RpcCall[];
  fromTables: string[];
}

function createMutationMock(): MutationMock {
  const rpcCalls: RpcCall[] = [];
  const fromTables: string[] = [];
  const client = {
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return {
        single: (): Promise<{ data: Record<string, unknown>; error: null }> =>
          Promise.resolve({ data: { id: 'booking-1' }, error: null }),
      };
    },
    from: (table: string): never => {
      fromTables.push(table);
      throw new Error(`from(${table}) must not be used by booking mutations`);
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, rpcCalls, fromTables };
}

describe('booking mutations', () => {
  it('acceptBooking calls helper_accept_booking with p_booking_id', async () => {
    const { client, rpcCalls } = createMutationMock();
    await acceptBooking(client, 'booking-1');
    expect(rpcCalls).toEqual([
      { fn: 'helper_accept_booking', args: { p_booking_id: 'booking-1' } },
    ]);
  });

  it('startBooking calls helper_start_booking with p_booking_id', async () => {
    const { client, rpcCalls } = createMutationMock();
    await startBooking(client, 'booking-1');
    expect(rpcCalls).toEqual([{ fn: 'helper_start_booking', args: { p_booking_id: 'booking-1' } }]);
  });

  it('completeBooking calls helper_complete_booking with p_booking_id', async () => {
    const { client, rpcCalls } = createMutationMock();
    await completeBooking(client, 'booking-1');
    expect(rpcCalls).toEqual([
      { fn: 'helper_complete_booking', args: { p_booking_id: 'booking-1' } },
    ]);
  });

  it('rejectBooking omits p_reason when not given', async () => {
    const { client, rpcCalls } = createMutationMock();
    await rejectBooking(client, 'booking-1');
    expect(rpcCalls).toEqual([
      { fn: 'helper_reject_booking', args: { p_booking_id: 'booking-1' } },
    ]);
  });

  it('rejectBooking passes p_reason when given', async () => {
    const { client, rpcCalls } = createMutationMock();
    await rejectBooking(client, 'booking-1', 'no time');
    expect(rpcCalls).toEqual([
      { fn: 'helper_reject_booking', args: { p_booking_id: 'booking-1', p_reason: 'no time' } },
    ]);
  });

  it('cancelBooking calls seeker_cancel_booking', async () => {
    const { client, rpcCalls } = createMutationMock();
    await cancelBooking(client, 'booking-1', 'changed plans');
    expect(rpcCalls).toEqual([
      {
        fn: 'seeker_cancel_booking',
        args: { p_booking_id: 'booking-1', p_reason: 'changed plans' },
      },
    ]);
  });

  it('updateBookingRequest calls the guarded seeker RPC', async () => {
    const { client, rpcCalls } = createMutationMock();
    await updateBookingRequest(client, {
      bookingId: 'booking-1',
      type: 'walk',
      startAt: '2026-10-01T10:00:00.000Z',
      endAt: '2026-10-01T12:00:00.000Z',
      meetingAddress: 'Park 1',
      currency: 'EUR',
      priceEurCents: 1250,
      isUrgent: true,
      careNotes: 'Leine mitbringen',
      careLocation: 'at_owner_home',
    });
    expect(rpcCalls).toEqual([
      {
        fn: 'seeker_update_booking_request',
        args: {
          p_booking_id: 'booking-1',
          p_type: 'walk',
          p_start_at: '2026-10-01T10:00:00.000Z',
          p_end_at: '2026-10-01T12:00:00.000Z',
          p_meeting_address: 'Park 1',
          p_currency: 'EUR',
          p_price_eur_cents: 1250,
          p_price_kiez_hours: 0,
          p_is_urgent: true,
          p_care_notes: 'Leine mitbringen',
          p_care_location: 'at_owner_home',
        },
      },
    ]);
  });

  it('rateHelper calls seeker_rate_helper with rating and review', async () => {
    const { client, rpcCalls } = createMutationMock();
    await rateHelper(client, {
      bookingId: 'booking-1',
      friendliness: 5,
      reliability: 4,
      animalCare: 5,
      communication: 4,
      review: 'great walk',
    });
    expect(rpcCalls).toEqual([
      {
        fn: 'seeker_rate_helper',
        args: {
          p_booking_id: 'booking-1',
          p_friendliness: 5,
          p_reliability: 4,
          p_animal_care: 5,
          p_communication: 4,
          p_review: 'great walk',
        },
      },
    ]);
  });

  it('rateSeeker calls helper_rate_seeker without review when omitted', async () => {
    const { client, rpcCalls } = createMutationMock();
    await rateSeeker(client, {
      bookingId: 'booking-1',
      friendliness: 4,
      reliability: 4,
      animalCare: 3,
      communication: 5,
    });
    expect(rpcCalls).toEqual([
      {
        fn: 'helper_rate_seeker',
        args: {
          p_booking_id: 'booking-1',
          p_friendliness: 4,
          p_reliability: 4,
          p_animal_care: 3,
          p_communication: 5,
        },
      },
    ]);
  });

  it('never calls timebank_adjust and never writes tables directly', async () => {
    const { client, rpcCalls, fromTables } = createMutationMock();
    await acceptBooking(client, 'b');
    await startBooking(client, 'b');
    await completeBooking(client, 'b');
    await rejectBooking(client, 'b');
    await cancelBooking(client, 'b');
    await updateBookingRequest(client, {
      bookingId: 'b',
      type: 'walk',
      startAt: '2026-10-01T10:00:00.000Z',
      endAt: '2026-10-01T12:00:00.000Z',
      currency: 'KIEZ_HOURS',
    });
    const rating = {
      bookingId: 'b',
      friendliness: 5,
      reliability: 5,
      animalCare: 5,
      communication: 5,
    };
    await rateHelper(client, rating);
    await rateSeeker(client, rating);
    expect(rpcCalls.some((call) => call.fn === 'timebank_adjust')).toBe(false);
    expect(fromTables).toEqual([]);
  });

  it('propagates RPC errors to the caller', async () => {
    const failing = {
      rpc: (_fn: string, _args: Record<string, unknown>) => ({
        single: (): Promise<{ data: null; error: { message: string } }> =>
          Promise.resolve({
            data: null,
            error: { message: 'Booking must be in_progress to complete' },
          }),
      }),
    };
    const client = failing as unknown as SupabaseClient<Database>;
    await expect(completeBooking(client, 'booking-1')).rejects.toThrow(
      'Booking must be in_progress to complete'
    );
  });
});
