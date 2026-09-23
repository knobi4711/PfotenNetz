/**
 * Parses German date/time text input ("TT.MM.JJJJ" + "HH:MM", Europe/Berlin wall time)
 * into an ISO-8601 timestamp. Returns null when the input is invalid.
 * Seconds are normalized to :00.
 */
export function parseGermanDateTime(dateText: string, timeText: string): string | null {
  const dateMatch = dateText.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const timeMatch = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (dateMatch === null || timeMatch === null) return null;

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  // Construct in the device's local timezone, then verify the components
  // round-trip (catches e.g. 31.02.).
  const candidate = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day ||
    candidate.getHours() !== hour ||
    candidate.getMinutes() !== minute
  ) {
    return null;
  }
  return candidate.toISOString();
}

/** Formats an ISO timestamp back to German "TT.MM.JJJJ" + "HH:MM" wall time. */
export function formatGermanDateTime(iso: string): { date: string; time: string } | null {
  const parsed = new Date(iso).getTime();
  if (!Number.isFinite(parsed)) return null;
  const value = new Date(parsed);
  const pad = (part: number) => String(part).padStart(2, '0');
  return {
    date: `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}
