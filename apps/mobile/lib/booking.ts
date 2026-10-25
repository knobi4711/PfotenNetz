import type { Database } from '@pfotennetz/supabase';
import type { TimebankTransaction } from '@pfotennetz/supabase';
import { timebankTransactionDescription } from '@pfotennetz/shared';

export type BookingStatus = Database['public']['Enums']['booking_status'];
export type BookingType = Database['public']['Enums']['booking_type'];
export type KeyHandoffType = Database['public']['Enums']['key_handoff_type'];
export type TimebankTxType = Database['public']['Enums']['timebank_tx_type'];

export const bookingStatusLabels: Record<BookingStatus, string> = {
  requested: 'Angefragt',
  awaiting_seeker: 'Wartet auf deine Entscheidung',
  confirmed: 'Bestätigt',
  in_progress: 'Läuft gerade',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  disputed: 'Streitfall',
};

/** The four-step happy-path workflow shown as a timeline. */
export const bookingWorkflowSteps: BookingStatus[] = [
  'requested',
  'awaiting_seeker',
  'confirmed',
  'in_progress',
  'completed',
];

export const bookingWorkflowStepLabels: Record<string, string> = {
  requested: 'Angefragt',
  awaiting_seeker: 'Helfer hat zugesagt',
  confirmed: 'Bestätigt',
  in_progress: 'Läuft',
  // The timeline columns are narrow; break the compound at its syllable
  // boundary with a visible hyphen instead of letting Android split it
  // anywhere ("Abgeschlosse|n").
  completed: 'Abge-\nschlossen',
};

export const bookingTypeLabels: Record<BookingType, string> = {
  walk: 'Gassirunde',
  feeding: 'Fütterung',
  vacation: 'Urlaubsbetreuung',
  daycare: 'Tagesbetreuung',
  ride: 'Ausreiten',
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

/**
 * User-facing German description for a timebank transaction.
 * Delegates to the shared translation so web and mobile stay in sync.
 */
export function timebankTxDescription(
  tx: Pick<TimebankTransaction, 'type' | 'reference_type' | 'description' | 'metadata'>
): string {
  return timebankTransactionDescription(tx);
}
