'use client';

import {
  groupBookingsByRequest,
  useBookings,
  useCurrentUser,
  type BookingRequestGroup,
} from '@pfotennetz/supabase';
import { bookingTypeLabel } from '@pfotennetz/shared';
import { useRouter } from 'next/navigation';
import { WebHeader } from '../../components/WebHeader';

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
}: {
  request: BookingRequestGroup;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const booking = request.primary;
  const isHelper = booking.helper_id === currentUserId;
  const petNames = request.bookings.map((item) => item.pet?.name ?? 'Tier');
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
            {bookingTypeLabel(booking.type)} · {isHelper ? 'Du hilfst' : 'Deine Anfrage'}
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
    </button>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const bookings = useBookings();
  const user = useCurrentUser();
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
        {bookings.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Buchungen werden geladen …</p>
        ) : bookings.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
            Buchungen konnten nicht geladen werden: {bookings.error.message}
          </p>
        ) : data.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl">🐾</p>
            <h2 className="mt-4 text-xl font-extrabold">Noch keine Buchungen</h2>
            <p className="mt-2 text-on-surface-variant">
              Finde jetzt Unterstützung in deiner Nachbarschaft.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <BookingCard
                key={request.id}
                request={request}
                currentUserId={user.data?.id ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
