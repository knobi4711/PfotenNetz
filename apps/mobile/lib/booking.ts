import type { Database } from '@pfotennetz/supabase';
import type { TimebankTransaction } from '@pfotennetz/supabase';

export type BookingStatus = Database['public']['Enums']['booking_status'];
export type BookingType = Database['public']['Enums']['booking_type'];
export type KeyHandoffType = Database['public']['Enums']['key_handoff_type'];
export type TimebankTxType = Database['public']['Enums']['timebank_tx_type'];

export const bookingStatusLabels: Record<BookingStatus, string> = {
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  in_progress: 'Läuft gerade',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  disputed: 'Streitfall',
};

/** The four-step happy-path workflow shown as a timeline. */
export const bookingWorkflowSteps: BookingStatus[] = [
  'requested',
  'confirmed',
  'in_progress',
  'completed',
];

export const bookingWorkflowStepLabels: Record<string, string> = {
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  in_progress: 'Läuft',
  completed: 'Abgeschlossen',
};

export const bookingTypeLabels: Record<BookingType, string> = {
  walk: 'Gassirunde',
  feeding: 'Fütterung',
  vacation: 'Urlaubsbetreuung',
  daycare: 'Tagesbetreuung',
};

export const keyHandoffLabels: Record<string, string> = {
  lockbox: 'Schlüsselbox',
  personal: 'Persönliche Übergabe',
  smartlock: 'Smartlock',
  neighbor: 'Nachbar:in',
};

export const timebankTxTypeLabels: Record<TimebankTxType, string> = {
  earned: 'Verdient',
  spent: 'Ausgegeben',
  bonus: 'Bonus',
  adjustment: 'Korrektur',
  transfer: 'Übertrag',
};

export function keyHandoffLabel(value: KeyHandoffType | null): string {
  if (value === null) return '–';
  return keyHandoffLabels[value] ?? value;
}

function metadataBookingNumber(metadata: TimebankTransaction['metadata']): string | null {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)['booking_number'];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * User-facing German description for a timebank transaction.
 * Prefers tx.type plus the readable booking number from metadata;
 * falls back to parsing the server-generated English description;
 * unknown descriptions are returned unchanged.
 */
export function timebankTxDescription(
  tx: Pick<TimebankTransaction, 'type' | 'reference_type' | 'description' | 'metadata'>
): string {
  const isBookingTx =
    tx.reference_type === 'booking_earned' || tx.reference_type === 'booking_spent';
  if (isBookingTx) {
    const bookingNumber = metadataBookingNumber(tx.metadata);
    if (bookingNumber !== null) {
      if (tx.type === 'earned') return `Für Buchung ${bookingNumber} erhalten`;
      if (tx.type === 'spent') return `Für Buchung ${bookingNumber} ausgegeben`;
    }
  }
  const earned = tx.description.match(/^Kiez-Hours earned for booking (\S+)\s*$/);
  if (earned !== null) return `Für Buchung ${earned[1]} erhalten`;
  const spent = tx.description.match(/^Kiez-Hours spent for booking (\S+)\s*$/);
  if (spent !== null) return `Für Buchung ${spent[1]} ausgegeben`;
  return tx.description;
}
