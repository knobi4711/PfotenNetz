'use client';

import {
  signOut,
  useAuth,
  useBookings,
  useOwnPets,
  useOwnProfile,
  useTimebankAccount,
  useUnreadCount,
} from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PasskeyPanel } from './PasskeyPanel';

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

export function Dashboard() {
  const auth = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const profile = useOwnProfile();
  const pets = useOwnPets();
  const bookings = useBookings();
  const account = useTimebankAccount();
  const unread = useUnreadCount();

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
  const visibleBookings = (bookings.data ?? [])
    .filter((booking) => booking.status !== 'cancelled')
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
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed text-2xl">
              🐾
            </span>
            <span className="text-xl font-extrabold text-on-surface">PfotenNetz</span>
          </a>
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Hauptnavigation">
            {[
              'Dashboard',
              'Nachbarschaftskarte',
              'Gefahrenradar',
              'Betreuung & Tracking',
              'Community',
            ].map((item, index) => (
              <button
                key={item}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-on-surface-variant hover:bg-surface-container'}`}
                onClick={() => {
                  if (item === 'Nachbarschaftskarte') router.push('/explore');
                  if (item === 'Gefahrenradar') router.push('/hazard/radar');
                  if (item === 'Betreuung & Tracking') router.push('/tracking');
                  if (item === 'Community') router.push('/community');
                }}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container md:inline-flex">
              {Number(account.data?.balance_hours ?? 0).toLocaleString('de-DE')} Std. Zeitbank
            </span>
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
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push('/hazard/radar')}
          >
            Gefahrenradar öffnen
          </button>
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
                          <img
                            src={pet.avatar_url}
                            alt={`Foto von ${pet.name}`}
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
            <article className="card bg-secondary-container p-6">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-on-secondary-container">
                Pfotenschutz
              </p>
              <p className="text-3xl font-extrabold text-on-secondary-container">21°C</p>
              <p className="mt-1 text-on-secondary-container">Asphalt heute sicher für Pfoten.</p>
            </article>
          </div>

          <div className="space-y-6">
            <article className="card p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-extrabold">Betreuung & Anfragen</h2>
                <button
                  type="button"
                  className="text-sm font-bold text-primary"
                  onClick={() => router.push('/bookings')}
                >
                  Alle anzeigen
                </button>
              </div>
              {bookings.isPending ? (
                <p className="text-sm text-on-surface-variant">Anfragen werden geladen …</p>
              ) : visibleBookings.length ? (
                <div className="space-y-3">
                  {visibleBookings.map((booking) => (
                    <button
                      type="button"
                      key={booking.id}
                      className="flex w-full items-center justify-between rounded-xl border border-outline-variant/40 p-4 text-left hover:bg-surface-container-low"
                      onClick={() => router.push(`/booking/${booking.id}`)}
                    >
                      <span>
                        <span className="block font-bold">
                          {booking.pet?.name ?? 'Tierbetreuung'}
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          {booking.type} · {statusLabel(booking.status)}
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
          <span>Impressum & Datenschutz · © 2026 PfotenNetz</span>
        </div>
      </footer>
    </div>
  );
}
