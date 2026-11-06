/**
 * Conversion helpers between the `HH:MM` clock strings used by availabilities
 * and the `Date` values expected by the native time picker.
 */

/** Parses `HH:MM` into a picker date on the same day as `base`. */
export function clockToPickerDate(value: string, base: Date = new Date()): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const hours = match ? Number(match[1]) : 0;
  const minutes = match ? Number(match[2]) : 0;
  const date = new Date(base);
  // `24:00` (a valid availability end) cannot be represented as a wall clock
  // time, so the picker starts at the latest representable hour instead.
  date.setHours(Math.min(23, Math.max(0, hours)), Math.min(59, Math.max(0, minutes)), 0, 0);
  return date;
}

/** Formats a picker date as `HH:MM`. */
export function pickerDateToClock(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
