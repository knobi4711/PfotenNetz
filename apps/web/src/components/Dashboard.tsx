'use client';

import {
  signOut,
  groupBookingsByRequest,
  useAuth,
  useBookings,
  useOwnPets,
  useOwnProfile,
  useOwnContactRequests,
  useRespondContactRequest,
  useCancelContactRequest,
  useTimebankAccount,
  useUnreadCount,
} from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { bookingTypeLabel } from '@pfotennetz/shared';
import { PasskeyPanel } from './PasskeyPanel';
import { NotificationBell } from './NotificationBell';
import { getCurrentBrowserLocation } from '../lib/location';

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    requested: 'Angefragt',
    confirmed: 'Bestätigt',
    in_progress: 'Läuft gerade',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
  };
  return labels[status] ?? status;
}

function PawWeatherCard() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = () => {
    setLoading(true);
    setError(null);
    void getCurrentBrowserLocation()
      .then(({ latitude, longitude }) =>
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`
        )
      )
      .then(async (response) => {
        if (!response.ok) throw new Error('Wetterdaten konnten nicht geladen werden.');
        const data = (await response.json()) as { current?: { temperature_2m?: number } };
        const value = data.current?.temperature_2m;
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error('Keine aktuelle Temperatur verfügbar.');
        }
        setTemperature(value);
      })
      .catch((cause: unknown) => {
        setTemperature(null);
        setError(cause instanceof Error ? cause.message : 'Wetterdaten nicht verfügbar.');
      })
      .finally(() => setLoading(false));
  };

  const recommendation =
    temperature !== null && temperature >= 35
      ? 'Bei großer Hitze Pfoten besonders schützen.'
      : temperature !== null && temperature <= 0
        ? 'Bei Frost auf Streusalz und kalte Pfoten achten.'
        : 'Bei warmem Wetter den Asphalt trotzdem prüfen.';

  return (
    <article className="card bg-secondary-container p-6">
      <p className="mb-2 text-sm font-bold uppercase tracking-wider text-on-secondary-container">
        Pfotenschutz
      </p>
      {temperature !== null ? (
        <p className="text-3xl font-extrabold text-on-secondary-container">
          {temperature.toLocaleString('de-DE', { maximumFractionDigits: 1 })}°C
        </p>
      ) : (
        <p className="text-lg font-bold text-on-secondary-container">
          {loading ? 'Wetter wird geladen …' : 'Noch keine Wetterdaten'}
        </p>
      )}
      <p className="mt-1 text-on-secondary-container">
        {error ??
          (temperature !== null ? recommendation : 'Standort für aktuelle Wetterdaten verwenden.')}
      </p>
      <button
        type="button"
        onClick={loadWeather}
        disabled={loading}
        className="mt-4 rounded-full border border-on-secondary-container/40 px-4 py-2 text-sm font-bold text-on-secondary-container disabled:opacity-60"
      >
        {loading ? 'Wird geladen …' : temperature === null ? 'Wetter laden' : 'Aktualisieren'}
      </button>
    </article>
  );
}

const PLAY_STORE_URL = 'https://play.google.com/apps/internaltest/4700161905065273613';

function PlayStoreCard() {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void QRCode.toDataURL(PLAY_STORE_URL, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#211a16', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (mounted) setQrCode(dataUrl);
      })
      .catch(() => {
        // Keep the card usable with the direct link if QR generation fails.
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <article className="card overflow-hidden bg-primary-fixed p-6">
      <div className="mb-5">
        <p className="mb-2 text-sm font-bold uppercase tracking-wider text-on-primary-fixed-variant">
          PfotenNetz unterwegs
        </p>
        <h2 className="text-xl font-extrabold text-on-primary-fixed">Die App herunterladen</h2>
        <p className="mt-2 text-sm text-on-primary-fixed-variant">
          Mit der App bist du auch unterwegs direkt mit deiner Nachbarschaft verbunden.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-4">
        {qrCode ? (
          <Image
            src={qrCode}
            alt="QR-Code zum Herunterladen der PfotenNetz-App im Google Play Store"
            width={220}
            height={220}
            unoptimized
            className="h-auto w-full max-w-[220px]"
          />
        ) : (
          <div
            className="flex h-[220px] w-[220px] items-center justify-center text-center text-sm text-on-surface-variant"
            aria-label="QR-Code wird geladen"
          >
            QR-Code wird geladen …
          </div>
        )}
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-full bg-on-primary-fixed px-4 py-3 text-center text-sm font-bold text-primary-fixed transition-opacity hover:opacity-85"
        >
          Im Google Play Store öffnen ↗
        </a>
      </div>
    </article>
  );
}

export function Dashboard() {
  const auth = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profile = useOwnProfile();
  const pets = useOwnPets();
  const bookings = useBookings();
  const account = useTimebankAccount();
  const unread = useUnreadCount();
  const contactRequests = useOwnContactRequests();
  const respondContactRequest = useRespondContactRequest();
  const cancelContactRequest = useCancelContactRequest();

  if (auth.status !== 'authenticated') {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-3xl">
              🐾
            </div>
            <h1 className="text-3xl font-extrabold text-on-surface">PfotenNetz</h1>
            <p className="mt-2 text-on-surface-variant">
              Deine Nachbarschaft für gute Tierbetreuung.
            </p>
          </div>
          <PasskeyPanel />
        </div>
      </main>
    );
  }

  const displayName = profile.data?.display_name ?? 'Nachbarin oder Nachbar';
  const visibleBookings = groupBookingsByRequest(bookings.data ?? [])
    .filter((request) => request.primary.status !== 'cancelled')
    .slice(0, 4);

  const handleSignOut = () => {
    setSigningOut(true);
    void signOut().finally(() => setSigningOut(false));
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 border-b border-outline-variant/30 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <a href="/" className="flex items-center gap-3" aria-label="PfotenNetz Startseite">
            <Image
              src="/pfotennetz-logo.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl object-cover"
              priority
            />
            <span className="text-xl font-extrabold text-on-surface">PfotenNetz</span>
          </a>
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Hauptnavigation">
            {[
              'Dashboard',
              'Nachbarschaftskarte',
              'Gefahrenradar',
              'Betreuung & Tracking',
              'Community',
              'Mein Profil',
            ].map((item, index) =>
              item === 'Community' ? (
                <div key={item} className="relative">
                  <button
                    type="button"
                    aria-expanded={communityOpen}
                    aria-haspopup="menu"
                    className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
                    onClick={() => setCommunityOpen((open) => !open)}
                  >
                    Community <span aria-hidden="true">⌄</span>
                  </button>
                  {communityOpen ? (
                    <div
                      role="menu"
                      className="absolute left-0 top-full z-20 mt-2 min-w-56 rounded-2xl border border-outline-variant/40 bg-surface p-2 shadow-[var(--shadow-level-2)]"
                    >
                      <Link
                        href="/community"
                        role="menuitem"
                        onClick={() => setCommunityOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                      >
                        Community &amp; Treffen
                      </Link>
                      <Link
                        href="/marketplace"
                        role="menuitem"
                        onClick={() => setCommunityOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                      >
                        Tauschbörse für Tierbedarf
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : item === 'Mein Profil' ? (
                <div key={item} className="relative">
                  <button
                    type="button"
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                    className="rounded-full px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
                    onClick={() => setProfileOpen((open) => !open)}
                  >
                    Mein Profil <span aria-hidden="true">⌄</span>
                  </button>
                  {profileOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-20 mt-2 min-w-56 rounded-2xl border border-outline-variant/40 bg-surface p-2 shadow-[var(--shadow-level-2)]"
                    >
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                      >
                        Profileinstellungen
                      </Link>
                      <Link
                        href="/pets"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-xl px-4 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
                      >
                        Meine Tiere
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  onClick={() => {
                    if (item === 'Nachbarschaftskarte') router.push('/explore');
                    if (item === 'Gefahrenradar') router.push('/hazard/radar');
                    if (item === 'Betreuung & Tracking') router.push('/tracking');
                  }}
                >
                  {item}
                </button>
              )
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container md:inline-flex">
              {Number(account.data?.balance_hours ?? 0).toLocaleString('de-DE')} Std. Zeitbank
            </span>
            <NotificationBell />
            <button
              type="button"
              disabled={signingOut}
              onClick={handleSignOut}
              className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10 lg:py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-secondary">
              Nachbarschafts-Feed
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
              Guten Morgen, {displayName}.
            </h1>
            <p className="mt-3 text-lg text-on-surface-variant">
              Alles Wichtige für deine Tiere und deine Nachbarschaft auf einen Blick.
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
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push('/hazard/radar')}
            >
              Gefahrenradar öffnen
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push('/marketplace')}
            >
              Tauschbörse
            </button>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr_1fr]" aria-label="Dashboard">
          <div className="space-y-6">
            <article className="card p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">Meine Schutzlinge</h2>
                <button
                  type="button"
                  className="text-sm font-bold text-primary"
                  onClick={() => router.push('/pets')}
                >
                  Verwalten
                </button>
              </div>
              {pets.isPending ? (
                <p className="text-sm text-on-surface-variant">Tiere werden geladen …</p>
              ) : pets.data?.length ? (
                <div className="space-y-3">
                  {pets.data.slice(0, 3).map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3"
                    >
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-primary-fixed text-2xl">
                        {pet.avatar_url ? (
                          <Image
                            src={pet.avatar_url}
                            alt={`Foto von ${pet.name}`}
                            width={56}
                            height={56}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : pet.species === 'cat' ? (
                          '🐱'
                        ) : (
                          '🐶'
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{pet.name}</p>
                        <p className="text-sm text-on-surface-variant">
                          {pet.breed ?? 'PfotenNetz-Mitglied'}
                          {pet.is_deceased ? ' · verstorben' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Noch kein Tierprofil angelegt.</p>
              )}
            </article>
            <article className="card p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">Kennenlernanfragen</h2>
                {contactRequests.isFetching && !contactRequests.isPending ? (
                  <span className="text-xs text-on-surface-variant">Aktualisiere …</span>
                ) : null}
              </div>
              {contactRequests.isPending ? (
                <p className="text-sm text-on-surface-variant">Anfragen werden geladen …</p>
              ) : contactRequests.isError ? (
                <p className="text-sm text-error">{contactRequests.error.message}</p>
              ) : contactRequests.data?.length ? (
                <div className="space-y-3">
                  {contactRequests.data.slice(0, 4).map((request) => {
                    const incoming = request.helper_id === auth.userId;
                    const status =
                      request.status === 'pending'
                        ? 'Offen'
                        : request.status === 'accepted'
                          ? 'Angenommen'
                          : request.status === 'declined'
                            ? 'Abgelehnt'
                            : 'Zurückgezogen';
                    return (
                      <div
                        key={request.id}
                        className="rounded-xl border border-outline-variant/40 p-4"
                      >
                        <p className="font-bold">
                          {incoming ? 'Neue Anfrage' : 'Deine Anfrage'} · {status}
                        </p>
                        <p className="mt-1 text-sm text-on-surface-variant">{request.message}</p>
                        {request.status === 'pending' ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {incoming ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  disabled={respondContactRequest.isPending}
                                  onClick={() =>
                                    respondContactRequest.mutate(
                                      { requestId: request.id, status: 'accepted' },
                                      { onSuccess: () => void contactRequests.refetch() }
                                    )
                                  }
                                >
                                  Annehmen
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  disabled={respondContactRequest.isPending}
                                  onClick={() =>
                                    respondContactRequest.mutate(
                                      { requestId: request.id, status: 'declined' },
                                      { onSuccess: () => void contactRequests.refetch() }
                                    )
                                  }
                                >
                                  Ablehnen
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={cancelContactRequest.isPending}
                                onClick={() =>
                                  cancelContactRequest.mutate(request.id, {
                                    onSuccess: () => void contactRequests.refetch(),
                                  })
                                }
                              >
                                Zurückziehen
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Noch keine Kennenlernanfragen.</p>
              )}
            </article>
            <PawWeatherCard />
          </div>

          <div className="space-y-6">
            <article className="card p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">Betreuung & Anfragen</h2>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="text-sm font-bold text-primary"
                    onClick={() => router.push('/bookings')}
                  >
                    Alle anzeigen
                  </button>
                  <button
                    type="button"
                    className="text-sm font-bold text-primary"
                    onClick={() => router.push('/booking/new')}
                  >
                    Neue Betreuung buchen
                  </button>
                </div>
              </div>
              {bookings.isPending ? (
                <p className="text-sm text-on-surface-variant">Anfragen werden geladen …</p>
              ) : visibleBookings.length ? (
                <div className="space-y-3">
                  {visibleBookings.map((request) => (
                    <button
                      type="button"
                      key={request.id}
                      className="flex w-full items-center justify-between rounded-xl border border-outline-variant/40 p-4 text-left hover:bg-surface-container-low"
                      onClick={() => router.push(`/booking/${request.primary.id}`)}
                    >
                      <span>
                        <span className="block font-bold">
                          {request.bookings
                            .map((booking) => booking.pet?.name ?? 'Tier')
                            .join(', ')}
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          {bookingTypeLabel(request.primary.type)} ·{' '}
                          {statusLabel(request.primary.status)}
                          {request.bookings.length > 1 ? ` · ${request.bookings.length} Tiere` : ''}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-primary">Öffnen →</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Noch keine laufenden Anfragen.</p>
              )}
            </article>
            <article className="card p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl">🤝</span>
                <div>
                  <h2 className="font-extrabold">Nachbarschaft aktiv</h2>
                  <p className="text-sm text-on-surface-variant">
                    Verifizierte Helfer:innen in deiner Nähe.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => router.push('/explore')}
              >
                Helfer:innen entdecken
              </button>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="card p-6">
              <h2 className="mb-4 text-xl font-extrabold">Sicherheitsstatus</h2>
              <div className="rounded-xl bg-success-container p-4">
                <p className="font-bold text-on-success-container">● Normal & überwacht</p>
                <p className="mt-1 text-sm text-on-success-container">
                  {unread.data
                    ? `${unread.data} neue Mitteilung${unread.data === 1 ? '' : 'en'}`
                    : 'Keine neuen Warnungen'}
                  .
                </p>
              </div>
              <button
                type="button"
                className="btn-emergency mt-4 w-full"
                onClick={() => router.push('/hazard/radar')}
              >
                Gefahrenradar
              </button>
            </article>
            <PlayStoreCard />
            <article className="card p-6">
              <h2 className="mb-4 text-xl font-extrabold">Zeitbank-Konto</h2>
              <p className="text-4xl font-extrabold text-primary">
                {Number(account.data?.balance_hours ?? 0).toLocaleString('de-DE')} Std.
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Dein aktuelles Nachbarschafts-Guthaben.
              </p>
              <button
                type="button"
                className="btn-ghost mt-3 w-full"
                onClick={() => router.push('/profile')}
              >
                Verlauf ansehen
              </button>
            </article>
          </aside>
        </section>
      </main>
      <footer className="border-t border-outline-variant/30">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-6 py-6 text-sm text-on-surface-variant md:flex-row md:items-center md:justify-between lg:px-10">
          <span>Nachbarschafts-Netzwerk aktiv</span>
          <span>
            <Link href="/legal/terms" className="hover:text-primary">
              Nutzungsbedingungen
            </Link>{' '}
            ·{' '}
            <Link href="/legal/privacy" className="hover:text-primary">
              Datenschutz
            </Link>{' '}
            · Impressum · © 2026 PfotenNetz
          </span>
        </div>
      </footer>
    </div>
  );
}
