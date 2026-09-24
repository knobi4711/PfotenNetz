'use client';

import {
  useOwnProfile,
  useTimebankAccount,
  useTimebankTransactions,
  useUpdateOwnProfile,
  type KiezRadius,
  type NotificationPreferences,
} from '@pfotennetz/supabase';
import { WebHeader } from '../../components/WebHeader';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const profile = useOwnProfile();
  const account = useTimebankAccount();
  const transactions = useTimebankTransactions();
  const updateProfile = useUpdateOwnProfile();
  const value = profile.data;
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    hazards: true,
    bookings: true,
    community: true,
  });
  useEffect(() => {
    const current = value?.notification_prefs;
    if (typeof current !== 'object' || current === null) return;
    setPreferences({
      hazards: 'hazards' in current ? current.hazards === true : true,
      bookings: 'bookings' in current ? current.bookings === true : true,
      community: 'community' in current ? current.community === true : true,
    });
  }, [value]);
  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Mein Konto</p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Profil & Nachbarschaft</h1>
        {profile.isPending ? (
          <p className="mt-10 text-on-surface-variant">Profil wird geladen …</p>
        ) : profile.isError ? (
          <p
            role="alert"
            className="mt-10 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Profil konnte nicht geladen werden: {profile.error.message}
          </p>
        ) : value ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <section className="card p-7">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container text-2xl font-extrabold text-on-secondary-container">
                  {value.display_name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h2 className="text-2xl font-extrabold text-on-surface">{value.display_name}</h2>
                  <p className="text-sm text-secondary">Nachbarschafts-Mitglied</p>
                </div>
              </div>
              <dl className="mt-8 space-y-4 text-sm">
                <div>
                  <dt className="font-bold text-on-surface-variant">E-Mail</dt>
                  <dd className="mt-1 text-on-surface">{value.email}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Telefon</dt>
                  <dd className="mt-1 text-on-surface">{value.phone ?? 'Nicht hinterlegt'}</dd>
                </div>
                <div>
                  <dt className="font-bold text-on-surface-variant">Nachbarschafts-Radius</dt>
                  <dd className="mt-1 text-on-surface">
                    {Number(value.kiez_radius_km).toLocaleString('de-DE')} km
                  </dd>
                </div>
              </dl>
            </section>
            <div className="space-y-6">
              <section className="card p-7">
                <h2 className="text-xl font-extrabold text-on-surface">Benachrichtigungen</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Wähle, welche Push-Hinweise du erhalten möchtest.
                </p>
                <div className="mt-4 space-y-3">
                  {(
                    [
                      ['hazards', 'Akute Gefahren'],
                      ['bookings', 'Betreuungsanfragen'],
                      ['community', 'Community-Events'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex min-h-11 items-center gap-3 text-sm font-semibold"
                    >
                      <input
                        type="checkbox"
                        checked={preferences[key]}
                        onChange={() =>
                          setPreferences((current) => ({ ...current, [key]: !current[key] }))
                        }
                        className="h-5 w-5 accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-primary mt-5"
                  disabled={updateProfile.isPending}
                  onClick={() =>
                    value &&
                    updateProfile.mutate({
                      displayName: value.display_name,
                      phone: value.phone,
                      kiezRadiusKm: value.kiez_radius_km as KiezRadius,
                      notificationPrefs: preferences,
                    })
                  }
                >
                  {updateProfile.isPending ? 'Wird gespeichert …' : 'Einstellungen speichern'}
                </button>
                {updateProfile.isError ? (
                  <p role="alert" className="mt-3 text-sm text-error">
                    {updateProfile.error.message}
                  </p>
                ) : null}
              </section>
              <section className="card p-7">
                <h2 className="text-xl font-extrabold text-on-surface">Zeitbank-Konto</h2>
                {account.isPending ? (
                  <p className="mt-4 text-sm text-on-surface-variant">Kontostand wird geladen …</p>
                ) : (
                  <>
                    <p className="mt-4 text-5xl font-extrabold text-primary">
                      {Number(account.data?.balance_hours ?? 0).toLocaleString('de-DE')} Std.
                    </p>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Nachbarschafts-Guthaben für faire Betreuung.
                    </p>
                  </>
                )}{' '}
              </section>
              <section className="card p-7">
                <h2 className="text-xl font-extrabold text-on-surface">Letzte Bewegungen</h2>
                {transactions.isPending ? (
                  <p className="mt-4 text-sm text-on-surface-variant">Verlauf wird geladen …</p>
                ) : transactions.data?.length ? (
                  <div className="mt-4 divide-y divide-outline-variant/30">
                    {transactions.data.slice(0, 8).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 py-3 text-sm"
                      >
                        <span>
                          <span className="block font-semibold text-on-surface">
                            {transaction.description || transaction.type}
                          </span>
                          <span className="text-on-surface-variant">
                            {new Date(transaction.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </span>
                        <strong
                          className={
                            Number(transaction.amount_hours) >= 0 ? 'text-secondary' : 'text-error'
                          }
                        >
                          {Number(transaction.amount_hours) >= 0 ? '+' : ''}
                          {Number(transaction.amount_hours).toLocaleString('de-DE')} Std.
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-on-surface-variant">
                    Noch keine Bewegungen vorhanden.
                  </p>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
