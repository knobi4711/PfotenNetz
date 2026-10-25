export interface TimebankTransactionLike {
  type: string;
  reference_type?: string | null;
  description: string;
  metadata?: unknown;
}

export const TIME_SERVICE_UNIT_LABEL = 'Nachbarschafts-Stunden';

function bookingNumberFromMetadata(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)['booking_number'];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function bookingDescription(kind: 'earned' | 'spent', bookingNumber: string): string {
  const action = kind === 'earned' ? 'erhalten' : 'ausgegeben';
  return `${TIME_SERVICE_UNIT_LABEL} für Buchung ${bookingNumber} ${action}`;
}

/**
 * German, user-facing text for a timebank transaction.
 * The server stores English descriptions ("Kiez-Hours earned for booking …"),
 * so known patterns are translated for display in web and mobile.
 */
export function timebankTransactionDescription(tx: TimebankTransactionLike): string {
  const isBookingTransaction =
    tx.reference_type === 'booking_earned' || tx.reference_type === 'booking_spent';

  if (isBookingTransaction) {
    const bookingNumber = bookingNumberFromMetadata(tx.metadata);
    if (bookingNumber !== null) {
      const kind = tx.type === 'earned' ? 'earned' : tx.type === 'spent' ? 'spent' : null;
      if (kind !== null) return bookingDescription(kind, bookingNumber);
    }
  }

  const match = tx.description.match(/^Kiez-Hours (earned|spent) for booking (\S+)\s*$/);
  if (match !== null) {
    return bookingDescription(match[1] === 'earned' ? 'earned' : 'spent', match[2] as string);
  }

  return tx.description;
}
