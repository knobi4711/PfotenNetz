import { describe, expect, it } from 'vitest';
import { bookingKeys } from './keys';
import { timebankKeys } from '../timebank/keys';

describe('bookingKeys', () => {
  it('exposes the bookings list prefix', () => {
    expect(bookingKeys.all).toEqual(['bookings']);
  });

  it('builds the bookings list key under the prefix', () => {
    expect(bookingKeys.list()).toEqual(['bookings', 'list']);
  });

  it('builds the booking detail key as [booking, bookingId]', () => {
    expect(bookingKeys.detail('booking-1')).toEqual(['booking', 'booking-1']);
  });
});

describe('timebankKeys', () => {
  it('uses [timebank, account] for the own account', () => {
    expect(timebankKeys.account).toEqual(['timebank', 'account']);
  });

  it('uses [timebank, transactions] for the own transactions', () => {
    expect(timebankKeys.transactions).toEqual(['timebank', 'transactions']);
  });
});
