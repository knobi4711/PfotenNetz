import { groupBookingsByRequest, type BookingWithRelations } from '@pfotennetz/supabase';

export type HighlightKind = 'current' | 'upcoming' | 'open';

export interface HighlightedBooking {
  booking: BookingWithRelations;
  kind: HighlightKind;
}

export const highlightHeadings: Record<HighlightKind, string> = {
  current: 'Aktuelle Betreuung',
  upcoming: 'Nächste Betreuung',
  open: 'Offene Anfrage',
};

function startTime(booking: BookingWithRelations): number {
  return new Date(booking.start_at).getTime();
}

function endTime(booking: BookingWithRelations): number {
  return new Date(booking.end_at).getTime();
}

function byStartAsc(a: BookingWithRelations, b: BookingWithRelations): number {
  const diff = startTime(a) - startTime(b);
  if (diff !== 0) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function startsNowOrLater(booking: BookingWithRelations, nowMs: number): boolean {
  return startTime(booking) >= nowMs;
}

/**
 * True while the agreed care window is running (`start_at <= now < end_at`).
 * Legacy rows without a usable `end_at` fall back to the start time.
 */
function runsNow(booking: BookingWithRelations, nowMs: number): boolean {
  const start = startTime(booking);
  const end = endTime(booking);
  if (!Number.isFinite(start)) return false;
  if (!Number.isFinite(end)) return start <= nowMs;
  return start <= nowMs && end > nowMs;
}

/** True for future bookings and for windows that have not ended yet. */
function isRelevantNow(booking: BookingWithRelations, nowMs: number): boolean {
  return startsNowOrLater(booking, nowMs) || runsNow(booking, nowMs);
}

function toNowMs(now: Date | number): number {
  return now instanceof Date ? now.getTime() : now;
}

/**
 * Selects the single highlighted booking from already-loaded data.
 * Priority: in_progress or a confirmed booking whose care window is running
 * ("Aktuelle Betreuung") > earliest confirmed starting later
 * ("Nächste Betreuung") > earliest request that has not ended
 * ("Offene Anfrage"). Completed, cancelled, disputed and ended bookings are
 * never highlighted. Never mutates the input.
 */
export function selectHighlightedBooking(
  bookings: BookingWithRelations[],
  now: Date | number = new Date()
): HighlightedBooking | null {
  const nowMs = toNowMs(now);
  const grouped = groupBookingsByRequest(bookings).map((request) => request.primary);

  const current = grouped
    .filter(
      (b) => b.status === 'in_progress' || (b.status === 'confirmed' && runsNow(b, nowMs))
    )
    .sort(byStartAsc);
  const currentFirst = current[0];
  if (currentFirst !== undefined) return { booking: currentFirst, kind: 'current' };

  const upcoming = grouped
    .filter((b) => b.status === 'confirmed' && startsNowOrLater(b, nowMs))
    .sort(byStartAsc);
  const upcomingFirst = upcoming[0];
  if (upcomingFirst !== undefined) return { booking: upcomingFirst, kind: 'upcoming' };

  const open = grouped
    .filter((b) => b.status === 'requested' && isRelevantNow(b, nowMs))
    .sort(byStartAsc);
  const openFirst = open[0];
  if (openFirst !== undefined) return { booking: openFirst, kind: 'open' };

  return null;
}

export interface PreviewOptions {
  now?: Date | number;
  limit?: number;
}

/**
 * Small deterministic preview of relevant bookings: in_progress plus
 * requested/confirmed that start now or later or whose window is still
 * running, earliest first. The highlighted booking is excluded. Completed,
 * cancelled, disputed and ended bookings never appear. Never mutates the input.
 */
export function selectBookingPreview(
  bookings: BookingWithRelations[],
  options?: PreviewOptions
): BookingWithRelations[] {
  const nowMs = toNowMs(options?.now ?? new Date());
  const limit = options?.limit ?? 3;
  const highlightedId = selectHighlightedBooking(bookings, nowMs)?.booking.id;

  return groupBookingsByRequest(bookings)
    .map((request) => request.primary)
    .filter((b) => {
      if (b.id === highlightedId) return false;
      if (b.status === 'in_progress') return true;
      if (b.status === 'requested' || b.status === 'confirmed') {
        return isRelevantNow(b, nowMs);
      }
      return false;
    })
    .sort(byStartAsc)
    .slice(0, limit);
}
