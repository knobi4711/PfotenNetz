'use client';

import {
  useActiveTrackingSessions,
  useBookings,
  useCurrentUser,
  useTrackingPoints,
  useTrackingSubscription,
  type BookingWithRelations,
} from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';
import { LiveTrackingMap } from '../../components/LiveTrackingMap';
import { WebHeader } from '../../components/WebHeader';

function progress(booking: BookingWithRelations): number {
  const start = new Date(booking.start_at).getTime();
  const end = new Date(booking.end_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
}

export default function TrackingPage() {
  const router = useRouter();
  const bookings = useBookings();
  const user = useCurrentUser();
  const sessions = useActiveTrackingSessions();
  useTrackingSubscription();
  const active = (bookings.data ?? []).find((booking) => booking.status === 'in_progress');
  const activeSession = active
    ? (sessions.data ?? []).find((session) => session.booking_id === active.id)
    : undefined;
  const points = useTrackingPoints(activeSession?.id ?? null);
  const confirmed = (bookings.data ?? []).filter((booking) => booking.status === 'confirmed');
  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/bookings" backLabel="Anfragen" />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Betreuung</p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Live-Tracking & Chat</h1>
        <p className="mt-3 text-lg text-on-surface-variant">
          Behalte laufende Betreuungen und den nächsten Statuswechsel im Blick.
        </p>
        {bookings.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Betreuungen werden geladen …</p>
        ) : bookings.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Betreuungen konnten nicht geladen werden: {bookings.error.message}
          </p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="card overflow-hidden">
              {activeSession?.latest_latitude !== null &&
              activeSession?.latest_latitude !== undefined &&
              activeSession.latest_longitude !== null &&
              activeSession.latest_longitude !== undefined ? (
                <LiveTrackingMap
                  latitude={activeSession.latest_latitude}
                  longitude={activeSession.latest_longitude}
                  recordedAt={activeSession.latest_recorded_at}
                  points={points.data ?? []}
                />
              ) : (
                <div className="flex h-[430px] items-center justify-center bg-surface-container-low p-8 text-center text-on-surface-variant">
                  {active
                    ? 'Warte auf die erste sichere GPS-Position …'
                    : 'Keine aktive Tracking-Position'}
                </div>
              )}
              <div className="p-6">
                {active ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                          Aktive Betreuung
                        </p>
                        <h2 className="mt-1 text-2xl font-extrabold text-on-surface">
                          {active.pet?.name ?? 'Tier'} ist unterwegs
                        </h2>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {active.helper_id === user.data?.id
                            ? 'Du bist als Helfer:in unterwegs.'
                            : 'Dein:e Helfer:in ist unterwegs.'}
                        </p>
                      </div>
                      <span className="rounded-full bg-success-container px-3 py-1 text-xs font-bold text-on-success-container">
                        ● Live
                      </span>
                    </div>
                    <div className="mt-6">
                      <div className="mb-2 flex justify-between text-sm font-bold">
                        <span>Zeitfortschritt</span>
                        <span>{Math.round(progress(active))}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="h-full rounded-full bg-secondary"
                          style={{ width: `${progress(active)}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="text-xs text-on-surface-variant">Distanz</p>
                        <p className="mt-1 font-extrabold">
                          {activeSession
                            ? `${(activeSession.total_distance_meters / 1000).toFixed(2)} km`
                            : 'Wird verbunden …'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="text-xs text-on-surface-variant">Pausen</p>
                        <p className="mt-1 font-extrabold">Noch keine</p>
                      </div>
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <p className="text-xs text-on-surface-variant">Sicherheit</p>
                        <p className="mt-1 font-extrabold text-secondary">
                          {activeSession?.latest_recorded_at
                            ? `Stand ${new Date(
                                activeSession.latest_recorded_at
                              ).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Wird verbunden …'}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-4xl">🐾</p>
                    <h2 className="mt-4 text-xl font-extrabold">Keine aktive Betreuung</h2>
                    <p className="mt-2 text-on-surface-variant">
                      Sobald eine Betreuung startet, erscheint hier die Live-Ansicht.
                    </p>
                  </div>
                )}
              </div>
            </section>
            <aside className="space-y-6">
              <section className="card p-6" aria-live="polite" aria-label="Live-Tracking-Status">
                <h2 className="text-xl font-extrabold text-on-surface">Nächste Betreuung</h2>
                {confirmed.length ? (
                  <div className="mt-4 space-y-3">
                    {confirmed.slice(0, 3).map((booking) => (
                      <button
                        type="button"
                        key={booking.id}
                        onClick={() => router.push('/bookings')}
                        className="w-full rounded-xl border border-outline-variant/40 p-4 text-left hover:bg-surface-container-low"
                      >
                        <p className="font-bold text-on-surface">
                          {booking.pet?.name ?? 'Tierbetreuung'}
                        </p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {new Date(booking.start_at).toLocaleString('de-DE')}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-on-surface-variant">
                    Keine bestätigten Betreuungen.
                  </p>
                )}
              </section>
              <section className="card p-6">
                <h2 className="text-xl font-extrabold text-on-surface">Kommunikation</h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Tausche dich direkt über den Buchungs-Chat aus und sende Statusupdates oder Fotos
                  aus dem Browser.
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-4 w-full"
                  onClick={() => router.push(active ? `/chat/${active.id}` : '/bookings')}
                >
                  {active ? 'Aktiven Chat öffnen' : 'Buchungen öffnen'}
                </button>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
