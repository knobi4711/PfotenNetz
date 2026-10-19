'use client';

import {
  useOwnProfile,
  useTimebankAccount,
  useTimebankTransactions,
  useUpdateOwnLocation,
  useUpdateOwnProfile,
  useUploadOwnAvatar,
  KIEZ_RADIUS_OPTIONS,
  type KiezRadius,
  type NotificationPreferences,
} from '@pfotennetz/supabase';
import {
  reverseGeocodeOpenStreetMap,
  searchOpenStreetMap,
  type GeocodingResult,
} from '@pfotennetz/shared';
import { WebHeader } from '../../components/WebHeader';
import { AvailabilityManager } from '../../components/AvailabilityManager';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  formatBrowserAccuracy,
  getCurrentBrowserLocation,
  type BrowserLocation,
} from '../../lib/location';

type LocationCandidate = BrowserLocation & {
  displayName: string;
  source: 'browser' | 'manual';
};

export default function ProfilePage() {
  const profile = useOwnProfile();
  const account = useTimebankAccount();
  const transactions = useTimebankTransactions();
  const updateProfile = useUpdateOwnProfile();
  const updateLocation = useUpdateOwnLocation();
  const uploadAvatar = useUploadOwnAvatar();
  const value = profile.data;
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    hazards: true,
    bookings: true,
    community: true,
  });
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [radius, setRadius] = useState<KiezRadius>(1.5);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPending, setLocationPending] = useState(false);
  const [locationCandidate, setLocationCandidate] = useState<LocationCandidate | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([]);
  const [locationSearchPending, setLocationSearchPending] = useState(false);
  const avatarUrl = value?.avatar_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${value.avatar_url}`
    : null;
  useEffect(() => {
    if (value) {
      setDisplayName(value.display_name);
      setPhone(value.phone ?? '');
      setPostalCode(value.postal_code ?? '');
      setProfileBio(value.profile_bio ?? '');
      const currentRadius = Number(value.kiez_radius_km);
      if ((KIEZ_RADIUS_OPTIONS as readonly number[]).includes(currentRadius)) {
        setRadius(currentRadius as KiezRadius);
      }
    }
    const current = value?.notification_prefs;
    if (typeof current !== 'object' || current === null) return;
    setPreferences({
      hazards: 'hazards' in current ? current.hazards === true : true,
      bookings: 'bookings' in current ? current.bookings === true : true,
      community: 'community' in current ? current.community === true : true,
    });
  }, [value]);

  const locateHelperLocation = () => {
    setLocationMessage(null);
    setLocationError(null);
    setLocationPending(true);
    void getCurrentBrowserLocation()
      .then(async (location) => {
        let displayName = `Koordinaten ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
        try {
          const address = await reverseGeocodeOpenStreetMap(location.latitude, location.longitude);
          displayName = address.displayName;
        } catch {
          // The coordinates can still be confirmed if reverse geocoding is temporarily unavailable.
        }
        setLocationCandidate({ ...location, displayName, source: 'browser' });
      })
      .catch((error: unknown) =>
        setLocationError(
          error instanceof Error ? error.message : 'Standort konnte nicht ermittelt werden.'
        )
      )
      .finally(() => setLocationPending(false));
  };

  const searchHelperLocation = () => {
    setLocationError(null);
    setLocationSearchPending(true);
    void searchOpenStreetMap(locationQuery)
      .then((results) => {
        setLocationResults(results);
        if (results.length === 0) setLocationError('Kein passender Ort gefunden.');
      })
      .catch((error: unknown) =>
        setLocationError(
          error instanceof Error ? error.message : 'Ort konnte nicht gesucht werden.'
        )
      )
      .finally(() => setLocationSearchPending(false));
  };

  const confirmHelperLocation = () => {
    if (!locationCandidate) return;
    setLocationMessage(null);
    setLocationError(null);
    setLocationPending(true);
    void updateLocation
      .mutateAsync(locationCandidate)
      .then(() => {
        setLocationCandidate(null);
        setLocationMessage(
          'Standort sicher gespeichert. Er wird in der Suche nur gerundet angezeigt.'
        );
      })
      .catch((error: unknown) =>
        setLocationError(
          error instanceof Error ? error.message : 'Standort konnte nicht gespeichert werden.'
        )
      )
      .finally(() => setLocationPending(false));
  };

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
                <label className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-secondary-container text-2xl font-extrabold text-on-secondary-container">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profilfoto"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    value.display_name.slice(0, 1).toUpperCase()
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadAvatar.isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void file
                        .arrayBuffer()
                        .then((fileData) =>
                          uploadAvatar.mutate({ fileData, contentType: file.type })
                        );
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <div>
                  <h2 className="text-2xl font-extrabold text-on-surface">{value.display_name}</h2>
                  <p className="text-sm text-secondary">Nachbarschafts-Mitglied</p>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <div>
                  <label className="font-bold text-on-surface-variant" htmlFor="profile-name">
                    Anzeigename
                  </label>
                  <input
                    id="profile-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  />
                </div>
                <div>
                  <p className="font-bold text-on-surface-variant">E-Mail</p>
                  <p className="mt-1 text-sm text-on-surface">{value.email}</p>
                </div>
                <div>
                  <label className="font-bold text-on-surface-variant" htmlFor="profile-phone">
                    Telefon (optional)
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-on-surface-variant" htmlFor="profile-postal">
                    Postleitzahl *
                  </label>
                  <input
                    id="profile-postal"
                    inputMode="numeric"
                    maxLength={5}
                    pattern="[0-9]{5}"
                    required
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-on-surface-variant" htmlFor="profile-bio">
                    Kurzvorstellung (optional)
                  </label>
                  <textarea
                    id="profile-bio"
                    maxLength={500}
                    value={profileBio}
                    onChange={(event) => setProfileBio(event.target.value)}
                    className="mt-1 min-h-24 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  />
                </div>
                <div>
                  <p className="font-bold text-on-surface-variant">Suchradius</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {KIEZ_RADIUS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`rounded-full px-3 py-2 text-sm font-bold ${radius === option ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'}`}
                        onClick={() => setRadius(option)}
                      >
                        {option.toString().replace('.', ',')} km
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={updateProfile.isPending}
                  onClick={() =>
                    updateProfile.mutate({
                      displayName,
                      phone,
                      postalCode,
                      profileBio,
                      kiezRadiusKm: radius,
                      notificationPrefs: preferences,
                    })
                  }
                >
                  {updateProfile.isPending ? 'Wird gespeichert …' : 'Profil speichern'}
                </button>
              </div>
            </section>
            <div className="space-y-6">
              {value.role === 'helper' ? (
                <section className="card p-7">
                  <h2 className="text-xl font-extrabold text-on-surface">Helper-Standort</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Damit du in der Nachbarschaftssuche erscheinst, muss dein Standort gespeichert
                    sein. Andere Nutzer:innen sehen ihn nur auf etwa 100 Meter gerundet.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-on-surface">
                    {value.location_updated_at
                      ? `Zuletzt gespeichert: ${new Date(value.location_updated_at).toLocaleDateString('de-DE')}`
                      : 'Noch kein Standort gespeichert'}
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-5"
                    disabled={locationPending || updateLocation.isPending || locationSearchPending}
                    onClick={locateHelperLocation}
                  >
                    {locationPending ? 'Standort wird ermittelt …' : 'Standort ermitteln'}
                  </button>
                  {locationCandidate ? (
                    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-sm font-bold text-on-surface">Bitte Standort prüfen</p>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {locationCandidate.source === 'browser'
                          ? `Der Browser meldet: ${locationCandidate.displayName}. Angegebene Genauigkeit: ${formatBrowserAccuracy(locationCandidate.accuracy)}.`
                          : `Manuell ausgewählt: ${locationCandidate.displayName}.`}
                      </p>
                      {locationCandidate.source === 'browser' ? (
                        <p className="mt-2 text-sm text-on-surface-variant">
                          Speichere diesen Standort nur, wenn der angezeigte Ort wirklich stimmt.
                          Eine Browser-Ortung kann trotz Freigabe falsch liegen.
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={locationPending || updateLocation.isPending}
                          onClick={confirmHelperLocation}
                        >
                          Standort bestätigen und speichern
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-outline-variant px-4 py-2 text-sm font-bold"
                          disabled={locationPending || updateLocation.isPending}
                          onClick={() => setLocationCandidate(null)}
                        >
                          Verwerfen
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-5 border-t border-outline-variant/40 pt-4">
                    <p className="text-sm font-bold text-on-surface">Ort manuell auswählen</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Wenn der Browser den falschen Ort meldet, kannst du hier Stadt oder PLZ
                      eingeben.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        aria-label="Ort oder PLZ für den Helper-Standort"
                        className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
                        placeholder="z. B. Leipzig oder 04109"
                        value={locationQuery}
                        onChange={(event) => setLocationQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') searchHelperLocation();
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={locationSearchPending || locationQuery.trim().length < 3}
                        onClick={searchHelperLocation}
                      >
                        {locationSearchPending ? 'Suche …' : 'Ort suchen'}
                      </button>
                    </div>
                    {locationResults.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {locationResults.map((result) => (
                          <button
                            key={`${result.latitude}-${result.longitude}`}
                            type="button"
                            className="block w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-left text-sm hover:bg-surface-container"
                            onClick={() => {
                              setLocationCandidate({ ...result, source: 'manual' });
                              setLocationResults([]);
                              setLocationQuery(result.displayName);
                              setLocationError(null);
                            }}
                          >
                            {result.displayName}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {locationMessage ? (
                    <p role="status" className="mt-3 text-sm font-semibold text-green-700">
                      {locationMessage}
                    </p>
                  ) : null}
                  {locationError ? (
                    <p role="alert" className="mt-3 text-sm text-error">
                      {locationError}
                    </p>
                  ) : null}
                </section>
              ) : null}
              <AvailabilityManager />
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
                      displayName,
                      phone,
                      postalCode,
                      profileBio,
                      kiezRadiusKm: radius,
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
