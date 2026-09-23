import type { BookingWithRelations } from '@pfotennetz/supabase';

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

function byStartAsc(a: BookingWithRelations, b: BookingWithRelations): number {
  const diff = startTime(a) - startTime(b);
  if (diff !== 0) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function startsNowOrLater(booking: BookingWithRelations, nowMs: number): boolean {
  return startTime(booking) >= nowMs;
}

function toNowMs(now: Date | number): number {
  return now instanceof Date ? now.getTime() : now;
}

/**
 * Selects the single highlighted booking from already-loaded data.
 * Priority: in_progress ("Aktuelle Betreuung") > earliest confirmed
 * with start_at >= now ("Nächste Betreuung") > earliest requested with
 * start_at >= now ("Offene Anfrage"). Completed, cancelled, disputed
 * and past bookings are never highlighted. Never mutates the input.
 */
export function selectHighlightedBooking(
  bookings: BookingWithRelations[],
  now: Date | number = new Date()
): HighlightedBooking | null {
  const nowMs = toNowMs(now);

  const current = bookings.filter((b) => b.status === 'in_progress').sort(byStartAsc);
  const currentFirst = current[0];
  if (currentFirst !== undefined) return { booking: currentFirst, kind: 'current' };

  const upcoming = bookings
    .filter((b) => b.status === 'confirmed' && startsNowOrLater(b, nowMs))
    .sort(byStartAsc);
  const upcomingFirst = upcoming[0];
  if (upcomingFirst !== undefined) return { booking: upcomingFirst, kind: 'upcoming' };

  const open = bookings
    .filter((b) => b.status === 'requested' && startsNowOrLater(b, nowMs))
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
 * requested/confirmed starting now or later, earliest first. The
 * highlighted booking is excluded. Completed, cancelled, disputed and
 * past requested/confirmed bookings never appear. Never mutates the input.
 */
export function selectBookingPreview(
  bookings: BookingWithRelations[],
  options?: PreviewOptions
): BookingWithRelations[] {
  const nowMs = toNowMs(options?.now ?? new Date());
  const limit = options?.limit ?? 3;
  const highlightedId = selectHighlightedBooking(bookings, nowMs)?.booking.id;

  return bookings
    .filter((b) => {
      if (b.id === highlightedId) return false;
      if (b.status === 'in_progress') return true;
      if (b.status === 'requested' || b.status === 'confirmed') {
        return startsNowOrLater(b, nowMs);
      }
      return false;
    })
    .sort(byStartAsc)
    .slice(0, limit);
}
