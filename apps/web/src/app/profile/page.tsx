'use client';

import { useOwnProfile, useTimebankAccount, useTimebankTransactions } from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const profile = useOwnProfile();
  const account = useTimebankAccount();
  const transactions = useTimebankTransactions();
  const value = profile.data;
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xl font-extrabold text-on-surface"
          >
            🐾 PfotenNetz
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm font-bold text-primary"
          >
            ← Dashboard
          </button>
        </div>
      </header>
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
