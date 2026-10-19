'use client';

import { useState } from 'react';
import {
  groupBookingsByRequest,
  useArchivedBookings,
  useBookings,
  useCurrentUser,
  type BookingRequestGroup,
} from '@pfotennetz/supabase';
import { bookingTypeLabel } from '@pfotennetz/shared';
import { useRouter } from 'next/navigation';
import { WebHeader } from '../../components/WebHeader';
import { formatPetDisplayName } from '../../lib/pets';

const STATUS: Record<string, string> = {
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  in_progress: 'Läuft gerade',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
};

function BookingCard({
  request,
  currentUserId,
  archived = false,
}: {
  request: BookingRequestGroup;
  currentUserId: string | null;
  archived?: boolean;
}) {
  const router = useRouter();
  const booking = request.primary;
  const isHelper = booking.helper_id === currentUserId;
  const isOwnRequest = booking.seeker_id === currentUserId;
  const petNames = request.bookings.map((item) => formatPetDisplayName(item.pet));
  return (
    <button
      type="button"
      onClick={() => router.push(`/booking/${booking.id}`)}
      className="card w-full p-6 text-left hover:bg-surface-container-low"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-secondary">
            {booking.booking_number}
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-on-surface">
            {request.bookings.length > 1 ? `Betreuung für ${petNames.join(', ')}` : petNames[0]}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {bookingTypeLabel(booking.type)} ·{' '}
            {isHelper ? 'Du hilfst' : isOwnRequest ? 'Deine Anfrage' : 'Offene Anfrage'}
            {request.bookings.length > 1
              ? ` · ${request.bookings.length} Tiere in einem Antrag`
              : ''}
          </p>
        </div>
        <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-on-primary-fixed-variant">
          {STATUS[booking.status] ?? booking.status}
        </span>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-on-surface-variant sm:grid-cols-3">
        <span>
          <strong className="block text-on-surface">Start</strong>
          {new Date(booking.start_at).toLocaleString('de-DE')}
        </span>
        <span>
          <strong className="block text-on-surface">Ende</strong>
          {new Date(booking.end_at).toLocaleString('de-DE')}
        </span>
        <span>
          <strong className="block text-on-surface">Abrechnung</strong>
          {booking.currency === 'KIEZ_HOURS'
            ? `${booking.price_kiez_hours ?? 0} Std.`
            : `${((booking.price_eur_cents ?? 0) / 100).toFixed(2).replace('.', ',')} €${booking.currency === 'PER_VISIT' ? ' pro Besuch' : ''}`}
        </span>
      </div>
      <p className="mt-4 text-sm font-bold text-primary">Details öffnen →</p>
      {archived ? (
        <p className="mt-2 text-xs text-on-surface-variant">
          {booking.status === 'cancelled' ? 'Storniert' : 'Abgeschlossen'} am{' '}
          {new Date(booking.closed_at ?? booking.cancelled_at ?? booking.updated_at).toLocaleString(
            'de-DE'
          )}
        </p>
      ) : null}
    </button>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const [view, setView] = useState<'active' | 'archive'>('active');
  const activeBookings = useBookings();
  const archivedBookings = useArchivedBookings();
  const user = useCurrentUser();
  const bookings = view === 'active' ? activeBookings : archivedBookings;
  const data = bookings.data ?? [];
  const requests = groupBookingsByRequest(data);
  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">
              Betreuung
            </p>
            <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Anfragen & Betreuung</h1>
            <p className="mt-3 text-lg text-on-surface-variant">
              Alle laufenden und vergangenen Betreuungen an einem Ort.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push('/booking/new')}
            >
              Neue Betreuung buchen
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.push('/explore')}>
              Helfer:in finden
            </button>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Buchungsansicht">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'active'}
            className={view === 'active' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setView('active')}
          >
            Aktiv
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'archive'}
            className={view === 'archive' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setView('archive')}
          >
            Archiv
          </button>
        </div>
        {view === 'archive' ? (
          <p className="mb-6 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
            Betreuungsanfragen werden nach ihrem Ende aus der aktiven Ansicht hierher verschoben –
            unabhängig davon, ob ein:e Helfer:in gefunden wurde. Abgeschlossene und stornierte
            Buchungen bleiben ebenfalls im Archiv nachvollziehbar.
          </p>
        ) : null}
        {bookings.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Buchungen werden geladen …</p>
        ) : bookings.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
            Buchungen konnten nicht geladen werden: {bookings.error.message}
          </p>
        ) : data.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl">🐾</p>
            <h2 className="mt-4 text-xl font-extrabold">
              {view === 'archive' ? 'Archiv ist noch leer' : 'Noch keine Buchungen'}
            </h2>
            <p className="mt-2 text-on-surface-variant">
              {view === 'archive'
                ? 'Abgelaufene, abgeschlossene und stornierte Buchungen erscheinen hier.'
                : 'Finde jetzt Unterstützung in deiner Nachbarschaft.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <BookingCard
                key={request.id}
                request={request}
                currentUserId={user.data?.id ?? null}
                archived={view === 'archive'}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
