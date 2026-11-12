'use client';

import {
  BOOKING_TYPES,
  contactRequestErrorMessage,
  nearbyHelperErrorMessage,
  useCreateContactRequest,
  USER_REPORT_REASON_LABELS,
  userReportErrorMessage,
  useCreateUserReport,
  useHelperSearchOrigin,
  useNearbyHelpers,
  useOwnPets,
  type UserReportReason,
  type BookingType,
  type NearbyHelper,
} from '@pfotennetz/supabase';
import { BOOKING_TYPE_LABELS, MAX_HELPER_DISTANCE_KM, petHomeLabel } from '@pfotennetz/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useEffect, useRef } from 'react';
import { WebHeader } from '../../components/WebHeader';
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from '../../lib/map-tiles';

const SPECIES = [
  ['dog', 'Hund'],
  ['cat', 'Katze'],
  ['rabbit', 'Kaninchen'],
  ['guinea_pig', 'Meerschweinchen'],
  ['bird', 'Vogel'],
  ['horse', 'Pferd'],
  ['amphibian', 'Amphibie'],
  ['fish', 'Fisch'],
  ['other', 'Andere'],
] as const;
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

type MapHelper = Pick<
  NearbyHelper,
  'helper_id' | 'display_name' | 'latitude' | 'longitude' | 'distance_km'
>;

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
};

type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup;
  clearLayers: () => void;
};

type LeafletApi = {
  map: (element: HTMLDivElement) => LeafletMap;
  tileLayer: (
    url: string,
    options: { maxZoom: number; attribution: string }
  ) => { addTo: (map: LeafletMap) => void };
  layerGroup: () => LeafletLayerGroup;
  marker: (center: [number, number]) => {
    addTo: (target: LeafletLayerGroup) => {
      bindPopup: (content: string) => { on: (event: string, callback: () => void) => void };
    };
  };
};

function loadLeaflet(): Promise<LeafletApi> {
  const existing = document.querySelector<HTMLScriptElement>('script[data-pfotennetz-leaflet]');
  if (existing) {
    return new Promise((resolve) => {
      const check = () => {
        const leaflet = (window as unknown as { L?: LeafletApi }).L;
        if (leaflet) resolve(leaflet);
        else window.setTimeout(check, 50);
      };
      check();
    });
  }
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.async = true;
  script.dataset.pfotennetzLeaflet = 'true';
  document.head.appendChild(script);
  return new Promise((resolve, reject) => {
    script.onload = () => {
      const leaflet = (window as unknown as { L?: LeafletApi }).L;
      if (leaflet) resolve(leaflet);
      else reject(new Error('Kartenbibliothek konnte nicht geladen werden.'));
    };
    script.onerror = () => reject(new Error('Kartenbibliothek konnte nicht geladen werden.'));
  });
}

function mapZoomForHelpers(helpers: MapHelper[]): number {
  const maxDistanceKm = helpers.reduce(
    (max, helper) => Math.max(max, Number(helper.distance_km) || 0),
    0
  );
  if (maxDistanceKm <= 0) return 14;
  return Math.max(10, Math.min(15, Math.round(15 - Math.log2(Math.max(maxDistanceKm, 0.5)))));
}

function OSMMap({
  center,
  helpers,
  centerLabel,
  onSelect,
}: {
  center: { latitude: number; longitude: number };
  helpers: MapHelper[];
  centerLabel: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LeafletLayerGroup | null>(null);

  useEffect(() => {
    const linkId = 'pfotennetz-leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    let disposed = false;
    void loadLeaflet().then((leaflet) => {
      if (disposed || !containerRef.current) return;
      const isNewMap = !mapRef.current;
      const map = mapRef.current ?? leaflet.map(containerRef.current);
      mapRef.current = map;
      map.setView([center.latitude, center.longitude], mapZoomForHelpers(helpers));
      if (!layersRef.current) layersRef.current = leaflet.layerGroup().addTo(map);
      layersRef.current.clearLayers();
      if (isNewMap) {
        leaflet
          .tileLayer(MAP_TILE_URL, {
            maxZoom: 19,
            attribution: MAP_TILE_ATTRIBUTION,
          })
          .addTo(map);
      }
      leaflet
        .marker([center.latitude, center.longitude])
        .addTo(layersRef.current as LeafletLayerGroup)
        .bindPopup(`Dein ${centerLabel}`)
        .on('click', () => undefined);
      helpers.forEach((helper) => {
        leaflet
          .marker([helper.latitude, helper.longitude])
          .addTo(layersRef.current as LeafletLayerGroup)
          .bindPopup(
            `<strong>${helper.display_name}</strong><br>${Number(helper.distance_km).toLocaleString('de-DE')} km`
          )
          .on('click', () => onSelect(helper.helper_id));
      });
    });
    return () => {
      disposed = true;
    };
  }, [center, helpers, centerLabel, onSelect]);

  useEffect(() => () => mapRef.current?.remove(), []);

  return <div ref={containerRef} className="h-[520px] w-full rounded-3xl" />;
}

function HelperCard({
  helper,
  selected,
  onSelect,
}: {
  helper: NearbyHelper;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`w-full rounded-2xl border p-5 text-left transition ${selected ? 'border-primary bg-primary-fixed/40 shadow-[var(--shadow-level-1)]' : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-lg font-extrabold text-on-secondary-container">
            {helper.display_name.trim().slice(0, 1).toUpperCase() || '🐾'}
          </span>
          <span>
            <span className="block font-extrabold text-on-surface">{helper.display_name}</span>
            <span className="text-sm text-on-surface-variant">
              {helper.trust_level === 'gold' ? 'Gold-verifiziert' : 'Verifiziert'}
            </span>
          </span>
        </div>
        <span className="text-sm font-bold text-primary">
          {Number(helper.distance_km).toLocaleString('de-DE')} km
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <span className="rounded-lg bg-surface-container-low px-3 py-2 text-on-surface-variant">
          ★ {Number(helper.rating) ? Number(helper.rating).toFixed(1) : 'Neu'}
        </span>
        <span className="rounded-lg bg-surface-container-low px-3 py-2 text-on-surface-variant">
          {helper.total_walks} Einsätze
        </span>
      </div>
      {selected ? (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary">
          ✓ Ausgewählt
        </span>
      ) : null}
    </button>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType | null>(null);
  const [petSpecies, setPetSpecies] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [contactMessage, setContactMessage] = useState(
    'Hallo, ich würde dich gern vorab kennenlernen und die Betreuung besprechen.'
  );
  const [contactSent, setContactSent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<UserReportReason>('fake_profile');
  const [reportDetails, setReportDetails] = useState('');
  const createContact = useCreateContactRequest();
  const createReport = useCreateUserReport();
  const originQuery = useHelperSearchOrigin();
  const petsQuery = useOwnPets();
  const homeLabel = petHomeLabel(petsQuery.data ?? []);
  const center = originQuery.data ?? null;
  const search =
    center === null
      ? null
      : {
          ...center,
          radiusKm: MAX_HELPER_DISTANCE_KM,
          limit: 50,
          bookingType,
          petSpecies,
          dayOfWeek,
        };
  const helpersQuery = useNearbyHelpers(search);
  const helpers = helpersQuery.data ?? [];
  const selected = helpers.find((helper) => helper.helper_id === selectedId) ?? null;

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Entdecken</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-on-surface">
            Helfer:innen in der Nachbarschaft
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
            {`Verifizierte Unterstützung rund um dein ${homeLabel} – ohne zusätzliche Standortfreigabe.`}
          </p>
        </div>
        {center !== null ? (
          <>
            <div className="mb-6 rounded-2xl bg-surface-container-low p-4">
              <p className="text-sm font-bold">{`Rund um dein ${homeLabel}`}</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                {`Angezeigt werden Helfer:innen, deren eigene Reisebereitschaft dein ${homeLabel} erreicht. Ein zusätzlicher km-Radius ist nicht nötig.`}
              </p>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={() => router.push('/profile')}
              >
                {`${homeLabel} ändern`}
              </button>
            </div>
            <div className="mb-6 space-y-3 rounded-2xl bg-surface-container-low p-4">
              <p className="text-sm font-bold">Filter</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBookingType(null)}
                  aria-pressed={bookingType === null}
                  className={`chip ${bookingType === null ? 'chip-selected' : ''}`}
                >
                  Alle Betreuungsarten
                </button>
                {BOOKING_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBookingType(type)}
                    aria-pressed={bookingType === type}
                    className={`chip ${bookingType === type ? 'chip-selected' : ''}`}
                  >
                    {BOOKING_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPetSpecies(null)}
                  aria-pressed={petSpecies === null}
                  className={`chip ${petSpecies === null ? 'chip-selected' : ''}`}
                >
                  Alle Tierarten
                </button>
                {SPECIES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPetSpecies(value)}
                    aria-pressed={petSpecies === value}
                    className={`chip ${petSpecies === value ? 'chip-selected' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDayOfWeek(null)}
                  aria-pressed={dayOfWeek === null}
                  className={`chip ${dayOfWeek === null ? 'chip-selected' : ''}`}
                >
                  Jeder Tag
                </button>
                {DAYS.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setDayOfWeek(index)}
                    aria-pressed={dayOfWeek === index}
                    className={`chip ${dayOfWeek === index ? 'chip-selected' : ''}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
        {originQuery.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">
            {`${homeLabel} wird geladen …`}
          </p>
        ) : originQuery.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-error">
            {`${homeLabel} konnte nicht geladen werden: ${nearbyHelperErrorMessage(originQuery.error)}`}
          </p>
        ) : center === null ? (
          <section className="card p-12 text-center">
            <p className="text-5xl">📍</p>
            <h2 className="mt-4 text-2xl font-extrabold">{`${homeLabel} fehlt`}</h2>
            <p className="mx-auto mt-2 max-w-md text-on-surface-variant">
              {`Lege dein ${homeLabel} einmalig im Profil fest. Danach zeigt die Karte sofort alle Helfer:innen, deren Reisebereitschaft dich erreicht.`}
            </p>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => router.push('/profile')}
            >
              Zum Profil
            </button>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="mb-2 text-xs text-on-surface-variant">
                {helpers.length === 0
                  ? 'Die Karte zeigt aktuell keine Helfer:innen in deiner Nähe.'
                  : `Die Karte zeigt ${helpers.length === 1 ? 'eine Helferin bzw. einen Helfer' : `${helpers.length} Helfer:innen`} in deiner Nähe. Namen, Entfernung und Aktionen findest du in der Liste neben der Karte.`}
              </p>
              <div
                role="region"
                aria-label={`OpenStreetMap-Karte mit ${helpers.length} Helfer:innen in deiner Nähe`}
                className="overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-low shadow-[var(--shadow-level-1)]"
              >
                <OSMMap
                  center={center}
                  helpers={helpers}
                  centerLabel={homeLabel}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
            <div className="space-y-3">
              {helpersQuery.isPending ? (
                <p className="py-12 text-center text-on-surface-variant">
                  Helfer:innen werden gesucht …
                </p>
              ) : helpersQuery.isError ? (
                <p role="alert" className="rounded-xl bg-error-container p-4 text-error">
                  Suche fehlgeschlagen: {nearbyHelperErrorMessage(helpersQuery.error)}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold">{`Rund um dein ${homeLabel}`}</h2>
                    <span className="text-sm font-bold text-secondary">
                      {helpers.length} Treffer
                    </span>
                  </div>
                  {helpers.length === 0 ? (
                    <div className="card p-6 text-sm text-on-surface-variant">
                      {`Aktuell erreicht keine verifizierte Helferin und kein verifizierter Helfer dein ${homeLabel}. Sobald jemand die eigene Reisebereitschaft erweitert, erscheint die Person hier automatisch.`}
                    </div>
                  ) : (
                    helpers.map((helper) => (
                      <HelperCard
                        key={helper.helper_id}
                        helper={helper}
                        selected={helper.helper_id === selectedId}
                        onSelect={() => {
                          setSelectedId(helper.helper_id);
                          setContactSent(false);
                          createContact.reset();
                          setReportOpen(false);
                          createReport.reset();
                        }}
                      />
                    ))
                  )}
                </>
              )}
              {selected ? (
                <div className="card border-primary/40 bg-primary-fixed/30 p-5">
                  <p className="text-sm font-bold uppercase tracking-wider text-on-primary-fixed-variant">
                    Ausgewählt
                  </p>
                  <h3 className="mt-1 text-xl font-extrabold">{selected.display_name}</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Lerne die Person unverbindlich kennen. Telefonnummern und Adressen bleiben
                    geschützt.
                  </p>
                  <textarea
                    aria-label="Nachricht zur Kennenlernanfrage"
                    className="mt-4 min-h-24 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface"
                    disabled={createContact.isPending || contactSent}
                    maxLength={1000}
                    onChange={(event) => setContactMessage(event.target.value)}
                    value={contactMessage}
                  />
                  {createContact.isError ? (
                    <p role="alert" className="mt-2 text-sm font-semibold text-error">
                      {contactRequestErrorMessage(createContact.error)}
                    </p>
                  ) : null}
                  {contactSent ? (
                    <p className="mt-3 text-sm font-bold text-secondary">
                      Anfrage gesendet. Warte auf eine Antwort.
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary mt-4 w-full"
                      disabled={createContact.isPending}
                      onClick={() =>
                        createContact.mutate(
                          { helperId: selected.helper_id, message: contactMessage },
                          { onSuccess: () => setContactSent(true) }
                        )
                      }
                    >
                      {createContact.isPending ? 'Wird gesendet …' : 'Kennenlernen anfragen'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary mt-3 w-full"
                    onClick={() => router.push(`/booking/new?helperId=${selected.helper_id}`)}
                  >
                    Betreuung anfragen
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full text-sm font-bold text-error underline underline-offset-4"
                    onClick={() => setReportOpen((open) => !open)}
                  >
                    {reportOpen ? 'Meldung schließen' : 'Profil melden'}
                  </button>
                  {reportOpen ? (
                    <div className="mt-4 rounded-xl border border-error/30 bg-error-container/40 p-4">
                      <p className="text-sm font-bold text-on-error-container">
                        Warum möchtest du dieses Profil melden?
                      </p>
                      <select
                        aria-label="Meldegrund"
                        value={reportReason}
                        onChange={(event) =>
                          setReportReason(event.target.value as UserReportReason)
                        }
                        className="mt-3 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
                        disabled={createReport.isPending}
                      >
                        {Object.entries(USER_REPORT_REASON_LABELS).map(([reason, label]) => (
                          <option key={reason} value={reason}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        aria-label="Zusätzliche Informationen zur Meldung"
                        maxLength={2000}
                        value={reportDetails}
                        onChange={(event) => setReportDetails(event.target.value)}
                        placeholder="Zusätzliche Informationen (optional)"
                        className="mt-3 min-h-20 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm"
                        disabled={createReport.isPending}
                      />
                      <p className="mt-2 text-xs text-on-error-container">
                        Deine Meldung wird vertraulich von der Administration geprüft.
                      </p>
                      {createReport.isError ? (
                        <p role="alert" className="mt-2 text-sm font-semibold text-error">
                          {userReportErrorMessage(createReport.error)}
                        </p>
                      ) : null}
                      {createReport.isSuccess ? (
                        <p className="mt-3 text-sm font-bold text-secondary">
                          Danke, deine Meldung wurde übermittelt.
                        </p>
                      ) : (
                        <button
                          type="button"
                          className="btn-emergency mt-3 w-full"
                          disabled={createReport.isPending}
                          onClick={() =>
                            createReport.mutate({
                              reportedUserId: selected.helper_id,
                              reason: reportReason,
                              details: reportDetails,
                            })
                          }
                        >
                          {createReport.isPending ? 'Wird gesendet …' : 'Meldung absenden'}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
