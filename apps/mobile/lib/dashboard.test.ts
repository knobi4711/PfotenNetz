import { describe, expect, it } from 'vitest';
import type { BookingWithRelations } from '@pfotennetz/supabase';
import { highlightHeadings, selectBookingPreview, selectHighlightedBooking } from './dashboard';

const NOW = new Date('2026-09-22T08:00:00.000Z');

function booking(id: string, status: string, start_at: string): BookingWithRelations {
  return {
    id,
    status,
    start_at,
    booking_number: `BK-${id}`,
    type: 'walk',
    pet: { id: 'pet-1', name: 'Bella', species: 'dog' },
    seekerProfile: null,
    helperProfile: null,
  } as unknown as BookingWithRelations;
}

describe('selectHighlightedBooking', () => {
  it('prefers in_progress over confirmed and requested', () => {
    const list = [
      booking('c1', 'confirmed', '2026-09-23T10:00:00.000Z'),
      booking('p1', 'in_progress', '2026-09-22T07:00:00.000Z'),
      booking('r1', 'requested', '2026-09-24T10:00:00.000Z'),
    ];
    const result = selectHighlightedBooking(list, NOW);
    expect(result?.booking.id).toBe('p1');
    expect(result?.kind).toBe('current');
    expect(highlightHeadings[result?.kind ?? 'current']).toBe('Aktuelle Betreuung');
  });

  it('selects the earliest future confirmed booking', () => {
    const list = [
      booking('c2', 'confirmed', '2026-09-26T10:00:00.000Z'),
      booking('c1', 'confirmed', '2026-09-23T10:00:00.000Z'),
    ];
    const result = selectHighlightedBooking(list, NOW);
    expect(result?.booking.id).toBe('c1');
    expect(result?.kind).toBe('upcoming');
    expect(highlightHeadings[result?.kind ?? 'upcoming']).toBe('Nächste Betreuung');
  });

  it('falls back to requested with the "Offene Anfrage" heading', () => {
    const list = [booking('r1', 'requested', '2026-09-24T10:00:00.000Z')];
    const result = selectHighlightedBooking(list, NOW);
    expect(result?.booking.id).toBe('r1');
    expect(result?.kind).toBe('open');
    expect(highlightHeadings[result?.kind ?? 'open']).toBe('Offene Anfrage');
  });

  it('ignores past bookings', () => {
    const list = [
      booking('c1', 'confirmed', '2026-09-20T10:00:00.000Z'),
      booking('r1', 'requested', '2026-09-21T10:00:00.000Z'),
    ];
    expect(selectHighlightedBooking(list, NOW)).toBeNull();
  });

  it('never highlights completed, cancelled or disputed bookings', () => {
    const list = [
      booking('done', 'completed', '2026-09-30T10:00:00.000Z'),
      booking('cancel', 'cancelled', '2026-09-30T10:00:00.000Z'),
      booking('dispute', 'disputed', '2026-09-30T10:00:00.000Z'),
    ];
    expect(selectHighlightedBooking(list, NOW)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(selectHighlightedBooking([], NOW)).toBeNull();
  });

  it('does not mutate the input array', () => {
    const list = [
      booking('c2', 'confirmed', '2026-09-26T10:00:00.000Z'),
      booking('c1', 'confirmed', '2026-09-23T10:00:00.000Z'),
    ];
    const before = list.map((b) => b.id);
    selectHighlightedBooking(list, NOW);
    expect(list.map((b) => b.id)).toEqual(before);
  });
});

describe('selectBookingPreview', () => {
  it('returns at most 3 bookings', () => {
    const list = [
      booking('r1', 'requested', '2026-09-23T10:00:00.000Z'),
      booking('r2', 'requested', '2026-09-24T10:00:00.000Z'),
      booking('r3', 'requested', '2026-09-25T10:00:00.000Z'),
      booking('r4', 'requested', '2026-09-26T10:00:00.000Z'),
      booking('r5', 'requested', '2026-09-27T10:00:00.000Z'),
    ];
    const preview = selectBookingPreview(list, { now: NOW });
    expect(preview).toHaveLength(3);
  });

  it('excludes the highlighted booking from the preview', () => {
    const list = [
      booking('c1', 'confirmed', '2026-09-23T10:00:00.000Z'),
      booking('c2', 'confirmed', '2026-09-24T10:00:00.000Z'),
    ];
    const highlighted = selectHighlightedBooking(list, NOW);
    const preview = selectBookingPreview(list, { now: NOW });
    expect(highlighted?.booking.id).toBe('c1');
    expect(preview.map((b) => b.id)).toEqual(['c2']);
  });

  it('returns an empty preview for an empty list', () => {
    expect(selectBookingPreview([], { now: NOW })).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const list = [
      booking('r2', 'requested', '2026-09-24T10:00:00.000Z'),
      booking('r1', 'requested', '2026-09-23T10:00:00.000Z'),
    ];
    const before = list.map((b) => b.id);
    selectBookingPreview(list, { now: NOW });
    expect(list.map((b) => b.id)).toEqual(before);
  });
});
