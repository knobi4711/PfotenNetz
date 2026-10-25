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
  timebankTransactionDescription,
  type GeocodingAddress,
  type GeocodingResult,
} from '@pfotennetz/shared';
import { WebHeader } from '../../components/WebHeader';
import { AvailabilityManager } from '../../components/AvailabilityManager';
import Image from 'next/image';
import { getCurrentBrowserLocation, type BrowserLocation } from '../../lib/location';
import { useEffect, useRef, useState } from 'react';

type LocationCandidate = BrowserLocation & {
  displayName: string;
  source: 'browser' | 'manual';
  address?: GeocodingAddress;
};

function buildProfileAddress(
  address: GeocodingAddress | undefined
): { street: string; postalCode: string; city: string } | null {
  const street = address?.street?.trim() ?? '';
  const postalCode = address?.postalCode?.trim() ?? '';
  const city = address?.city?.trim() ?? '';
  if (!street || !/^\d{5}$/.test(postalCode) || !city) return null;
  return { street, postalCode, city };
}

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
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSavePending, setProfileSavePending] = useState(false);
  const [profileBio, setProfileBio] = useState('');
  const [radius, setRadius] = useState<KiezRadius>(1.5);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPending, setLocationPending] = useState(false);
  const [locationCandidate, setLocationCandidate] = useState<LocationCandidate | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([]);
  const [locationSearchPending, setLocationSearchPending] = useState(false);
  const [locationAddressPending, setLocationAddressPending] = useState(false);
  const locationAddressRequest = useRef(0);
  const avatarUrl = value?.avatar_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${value.avatar_url}`
    : null;
  useEffect(() => {
    if (value) {
      setDisplayName(value.display_name);
      setPhone(value.phone ?? '');
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

  const saveProfile = async () => {
    setProfileFormError(null);
    setProfileSaved(false);
    if (!/^\d{5}$/.test(value?.postal_code ?? '')) {
      setProfileFormError(
        'Für dein Profil fehlt noch eine vollständige Adresse. Bitte lege deinen Vermittlungsstandort rechts per GPS oder Ortssuche fest.'
      );
      return;
    }
    if (!(value?.private_address ?? '').trim()) {
      setProfileFormError(
        'Für dein Profil fehlt noch eine vollständige Adresse. Bitte lege deinen Vermittlungsstandort rechts per GPS oder Ortssuche fest.'
      );
      return;
    }

    setProfileSavePending(true);
    try {
      // Die Adresse wird bewusst unverändert übernommen – sie wird ausschließlich
      // im Vermittlungsstandort (GPS/Ortssuche) gesetzt, damit es nur eine Quelle gibt.
      await updateProfile.mutateAsync({
        displayName,
        phone,
        postalCode: value?.postal_code ?? '',
        privateAddress: value?.private_address ?? '',
        profileBio,
        kiezRadiusKm: radius,
        notificationPrefs: preferences,
      });
      setProfileSaved(true);
    } catch (error) {
      setProfileFormError(
        error instanceof Error ? error.message : 'Profil konnte nicht gespeichert werden.'
      );
    } finally {
      setProfileSavePending(false);
    }
  };

  const clearLocationCandidate = () => {
    locationAddressRequest.current += 1;
    setLocationAddressPending(false);
    setLocationCandidate(null);
  };

  /** Resolves a street address for a place selected from the manual search. */
  const applyLocationCandidate = (candidate: LocationCandidate) => {
    setLocationCandidate(candidate);
    setLocationError(null);
    if (buildProfileAddress(candidate.address)) return;

    const requestId = ++locationAddressRequest.current;
    setLocationAddressPending(true);
    void reverseGeocodeOpenStreetMap(candidate.latitude, candidate.longitude)
      .then((reverse) => {
        if (requestId !== locationAddressRequest.current) return;
        setLocationCandidate((current) => {
          if (
            !current ||
            current.latitude !== candidate.latitude ||
            current.longitude !== candidate.longitude
          ) {
            return current;
          }
          const address = reverse.address ?? current.address;
          return address ? { ...current, address } : current;
        });
      })
      .catch(() => {
        // The selected place can still be saved without a resolved street address.
      })
      .finally(() => {
        if (requestId === locationAddressRequest.current) setLocationAddressPending(false);
      });
  };

  const locateHelperLocation = () => {
    locationAddressRequest.current += 1;
    setLocationAddressPending(false);
    setLocationMessage(null);
    setLocationError(null);
    setLocationPending(true);
    void getCurrentBrowserLocation()
      .then(async (location) => {
        let candidateName = `Koordinaten ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
        let address: GeocodingAddress | undefined;
        try {
          const result = await reverseGeocodeOpenStreetMap(location.latitude, location.longitude);
          candidateName = result.displayName;
          address = result.address;
        } catch {
          // The coordinates can still be confirmed if reverse geocoding is temporarily unavailable.
        }
        setLocationCandidate({
          ...location,
          displayName: candidateName,
          ...(address ? { address } : {}),
          source: 'browser',
        });
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

  const pendingProfileAddress = locationCandidate
    ? buildProfileAddress(locationCandidate.address)
    : null;

  const confirmHelperLocation = () => {
    if (!locationCandidate || locationAddressPending) return;
    setLocationMessage(null);
    setLocationError(null);
    setLocationPending(true);

    const confirmedAddress = buildProfileAddress(locationCandidate.address);
    setProfileFormError(null);

    void updateLocation
      .mutateAsync(locationCandidate)
      .then(async () => {
        if (!confirmedAddress) {
          clearLocationCandidate();
          setLocationError(
            'Der Vermittlungsstandort wurde gespeichert, aber die Profiladresse ist noch unvollständig. Bitte bestimme den Standort erneut oder wähle den Ort über die Ortssuche.'
          );
          return;
        }

        try {
          await updateProfile.mutateAsync({
            displayName: displayName.trim() || value?.display_name || '',
            phone: phone.trim() || null,
            profileBio,
            kiezRadiusKm: radius,
            notificationPrefs: preferences,
            postalCode: confirmedAddress.postalCode,
            privateAddress: `${confirmedAddress.street}, ${confirmedAddress.postalCode} ${confirmedAddress.city}`,
          });
        } catch {
          setLocationError(
            'Der Vermittlungsstandort wurde gespeichert, aber die Profiladresse konnte nicht übernommen werden. Bitte versuche es erneut.'
          );
          return;
        }

        clearLocationCandidate();
        setLocationMessage(
          'Standort und Adresse wurden übernommen. Die genaue Position wird in Suchergebnissen nur gerundet verwendet.'
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
                  disabled={profileSavePending || updateProfile.isPending}
                  onClick={() => void saveProfile()}
                >
                  {profileSavePending ? 'Profil wird gespeichert …' : 'Profil speichern'}
                </button>
                {profileFormError ? (
                  <p role="alert" className="mt-2 text-sm text-error">
                    {profileFormError}
                  </p>
                ) : null}
                {profileSaved ? (
                  <p role="status" className="mt-2 text-sm font-semibold text-green-700">
                    Profil gespeichert. Deine Adresse verwaltest du in der Karte
                    „Vermittlungsstandort“.
                  </p>
                ) : null}
              </div>
            </section>
            <div className="space-y-6">
              <section className="card p-7">
                <h2 className="text-xl font-extrabold text-on-surface">Vermittlungsstandort</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Wird automatisch aus deiner Profiladresse ermittelt. Alternativ kannst du hier
                  deinen aktuellen Standort per GPS bestimmen oder einen abweichenden Ort auswählen.
                  Die genaue Position bleibt privat und wird in der Suche nur gerundet angezeigt.
                </p>
                <p className="mt-4 text-sm font-semibold text-on-surface">
                  {value.location_updated_at
                    ? `Zuletzt aktualisiert: ${new Date(value.location_updated_at).toLocaleDateString('de-DE')}`
                    : 'Wird beim Speichern des Profils mit der Adresse abgeglichen.'}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {value.private_address
                    ? `Hinterlegte Profiladresse: ${value.private_address}`
                    : 'Noch keine Profiladresse hinterlegt. Bestimme deinen Standort oder wähle einen Ort unten aus.'}
                </p>
                <div className="mt-6 rounded-xl border border-outline-variant/40 p-4">
                  <p className="text-sm font-bold text-on-surface">
                    Aktuellen Standort per GPS bestimmen
                  </p>
                  <button
                    type="button"
                    className={`btn-secondary mt-3 w-full ${locationPending ? 'opacity-50' : ''}`}
                    disabled={locationPending || updateLocation.isPending}
                    onClick={locateHelperLocation}
                  >
                    {locationPending ? 'Standort wird ermittelt …' : 'Standort ermitteln'}
                  </button>
                  {locationCandidate ? (
                    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-sm font-bold text-on-surface">Bitte Standort prüfen</p>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {locationCandidate.source === 'browser'
                          ? `Der Browser meldet: ${locationCandidate.displayName}.`
                          : `Manuell ausgewählt: ${locationCandidate.displayName}.`}
                      </p>
                      {locationAddressPending ? (
                        <p className="mt-2 text-sm text-on-surface-variant">
                          Straßenadresse wird ermittelt …
                        </p>
                      ) : pendingProfileAddress ? (
                        <p className="mt-2 text-sm text-on-surface">
                          Wird als Profiladresse übernommen: {pendingProfileAddress.street},{' '}
                          {pendingProfileAddress.postalCode} {pendingProfileAddress.city}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-on-surface-variant">
                          Für diese Position wurde keine vollständige Straßenadresse ermittelt.
                          Wähle den Ort in diesem Fall über die Ortssuche unten.
                        </p>
                      )}
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
                          disabled={
                            locationPending || locationAddressPending || updateLocation.isPending
                          }
                          onClick={confirmHelperLocation}
                        >
                          Standort bestätigen und speichern
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-outline-variant px-4 py-2 text-sm font-bold"
                          disabled={locationPending || updateLocation.isPending}
                          onClick={clearLocationCandidate}
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
                        aria-label="Ort oder PLZ für den privaten Vermittlungsstandort"
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
                              applyLocationCandidate({ ...result, source: 'manual' });
                              setLocationResults([]);
                              setLocationQuery(result.displayName);
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
                </div>
                <p className="mt-3 text-sm text-on-surface-variant">
                  Ein abweichender Treffpunkt, zum Beispiel ein Stall, kann bei der jeweiligen
                  Betreuungsanfrage angegeben werden.
                </p>
              </section>
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
                  disabled={
                    profileSavePending || updateProfile.isPending || updateLocation.isPending
                  }
                  onClick={() => void saveProfile()}
                >
                  {profileSavePending
                    ? 'Einstellungen werden gespeichert …'
                    : 'Einstellungen speichern'}
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
                )}
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
                            {timebankTransactionDescription(transaction) || transaction.type}
                          </span>
                          <span className="text-on-surface-variant">
                            {new Date(transaction.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </span>
                        <span className="text-on-surface-variant">
                          {transaction.amount_hours !== undefined
                            ? `${transaction.amount_hours.toLocaleString('de-DE')} Std.`
                            : '–'}
                        </span>
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
