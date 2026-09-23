import { describe, expect, it } from 'vitest';
import { timebankTxDescription } from './booking';

function tx(overrides: {
  type?: string;
  reference_type?: string;
  description?: string;
  metadata?: unknown;
}) {
  return {
    type: 'spent',
    reference_type: 'booking_spent',
    description: '',
    metadata: {},
    ...overrides,
  } as Parameters<typeof timebankTxDescription>[0];
}

describe('timebankTxDescription', () => {
  it('prefers metadata booking number for spent bookings', () => {
    expect(
      timebankTxDescription(
        tx({
          type: 'spent',
          reference_type: 'booking_spent',
          description: 'Kiez-Hours spent for booking BK-1',
          metadata: { booking_id: 'uuid', booking_number: 'BK-1' },
        })
      )
    ).toBe('Für Buchung BK-1 ausgegeben');
  });

  it('prefers metadata booking number for earned bookings', () => {
    expect(
      timebankTxDescription(
        tx({
          type: 'earned',
          reference_type: 'booking_earned',
          description: 'Kiez-Hours earned for booking BK-1',
          metadata: { booking_id: 'uuid', booking_number: 'BK-1' },
        })
      )
    ).toBe('Für Buchung BK-1 erhalten');
  });

  it('parses the English description when metadata is missing', () => {
    expect(
      timebankTxDescription(
        tx({
          type: 'spent',
          reference_type: 'booking_spent',
          description: 'Kiez-Hours spent for booking BK-20260921-TB01',
          metadata: {},
        })
      )
    ).toBe('Für Buchung BK-20260921-TB01 ausgegeben');
  });

  it('keeps unknown descriptions unchanged', () => {
    expect(
      timebankTxDescription(
        tx({
          type: 'bonus',
          reference_type: 'manual',
          description: 'Manuelle Gutschrift',
          metadata: {},
        })
      )
    ).toBe('Manuelle Gutschrift');
  });
});
