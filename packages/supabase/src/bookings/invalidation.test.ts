import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateBookingQueries } from './hooks';
import { bookingKeys } from './keys';
import { timebankKeys } from '../timebank/keys';

describe('invalidateBookingQueries', () => {
  it('invalidates the booking detail, booking lists and both timebank queries', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(bookingKeys.detail('booking-1'), { id: 'booking-1' });
    queryClient.setQueryData(bookingKeys.all, [{ id: 'booking-1' }]);
    queryClient.setQueryData(timebankKeys.account, { balance_hours: 2 });
    queryClient.setQueryData(timebankKeys.transactions, []);
    queryClient.setQueryData(['unrelated'], { keep: true });

    invalidateBookingQueries(queryClient, 'booking-1');

    expect(queryClient.getQueryState(bookingKeys.detail('booking-1'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(bookingKeys.all)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(timebankKeys.account)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(timebankKeys.transactions)?.isInvalidated).toBe(true);
  });

  it('leaves unrelated queries untouched', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['unrelated'], { keep: true });

    invalidateBookingQueries(queryClient, 'booking-1');

    expect(queryClient.getQueryState(['unrelated'])?.isInvalidated).not.toBe(true);
  });

  it('only invalidates the detail of the completed booking', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(bookingKeys.detail('booking-1'), { id: 'booking-1' });
    queryClient.setQueryData(bookingKeys.detail('booking-2'), { id: 'booking-2' });

    invalidateBookingQueries(queryClient, 'booking-1');

    expect(queryClient.getQueryState(bookingKeys.detail('booking-1'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(bookingKeys.detail('booking-2'))?.isInvalidated).not.toBe(
      true
    );
  });
});
