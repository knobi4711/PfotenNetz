import { describe, expect, it } from 'vitest';
import { timebankTransactionDescription } from './timebank';

describe('timebankTransactionDescription', () => {
  it('prefers the readable booking number from metadata', () => {
    expect(
      timebankTransactionDescription({
        type: 'spent',
        reference_type: 'booking_spent',
        description: 'Kiez-Hours spent for booking BK-1',
        metadata: { booking_id: 'uuid', booking_number: 'BK-1' },
      })
    ).toBe('Nachbarschafts-Stunden für Buchung BK-1 ausgegeben');
    expect(
      timebankTransactionDescription({
        type: 'earned',
        reference_type: 'booking_earned',
        description: 'Kiez-Hours earned for booking BK-1',
        metadata: { booking_number: 'BK-2' },
      })
    ).toBe('Nachbarschafts-Stunden für Buchung BK-2 erhalten');
  });

  it('translates the stored English description without metadata', () => {
    expect(
      timebankTransactionDescription({
        type: 'spent',
        reference_type: 'booking_spent',
        description: 'Kiez-Hours spent for booking BK-20260921-TB01',
      })
    ).toBe('Nachbarschafts-Stunden für Buchung BK-20260921-TB01 ausgegeben');
    expect(
      timebankTransactionDescription({
        type: 'earned',
        reference_type: 'booking_earned',
        description: 'Kiez-Hours earned for booking BK-20260921-TB01',
      })
    ).toBe('Nachbarschafts-Stunden für Buchung BK-20260921-TB01 erhalten');
  });

  it('keeps unknown descriptions unchanged', () => {
    expect(
      timebankTransactionDescription({
        type: 'adjustment',
        reference_type: null,
        description: 'Kulanzgutschrift',
      })
    ).toBe('Kulanzgutschrift');
  });
});
