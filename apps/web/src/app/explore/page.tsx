'use client';

import {
  BOOKING_TYPES,
  contactRequestErrorMessage,
  nearbyHelperErrorMessage,
  useCreateContactRequest,
  useNearbyHelpers,
  type BookingType,
  type NearbyHelper,
} from '@pfotennetz/supabase';
import { searchOpenStreetMap, type GeocodingResult } from '@pfotennetz/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useEffect, useRef } from 'react';
import { WebHeader } from '../../components/WebHeader';

const RADII = [1.5, 3, 5, 10] as const;
const SPECIES = [
  ['dog', 'Hund'],
  ['cat', 'Katze'],
  ['rabbit', 'Kaninchen'],
  ['guinea_pig', 'Meerschweinchen'],
  ['bird', 'Vogel'],
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
  circle: (
    center: [number, number],
    options: Record<string, number | string>
  ) => { addTo: (map: LeafletMap) => void };
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

function OSMMap({
  center,
  radiusKm,
  helpers,
  onSelect,
}: {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  helpers: MapHelper[];
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
      map.setView(
        [center.latitude, center.longitude],
        Math.max(10, Math.round(15 - Math.log2(radiusKm)))
      );
      if (!layersRef.current) layersRef.current = leaflet.layerGroup().addTo(map);
      layersRef.current.clearLayers();
      if (isNewMap) {
        leaflet
          .tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap-Mitwirkende',
          })
          .addTo(map);
      }
      leaflet
        .circle([center.latitude, center.longitude], {
          radius: radiusKm * 1000,
          color: '#e26d46',
          fillColor: '#e26d46',
          fillOpacity: 0.12,
        })
        .addTo(map);
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
  }, [center, radiusKm, helpers, onSelect]);

  useEffect(() => () => mapRef.current?.remove(), []);

  return (
    <div
      ref={containerRef}
      className="h-[520px] w-full rounded-3xl"
      aria-label="OpenStreetMap-Karte"
    />
  );
}

function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Standortfreigabe wird von diesem Browser nicht unterstützt.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => reject(new Error('Standort konnte nicht bestimmt werden.')),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  });
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
    </button>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<(typeof RADII)[number]>(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<GeocodingResult[]>([]);
  const [placeSearchPending, setPlaceSearchPending] = useState(false);
  const [bookingType, setBookingType] = useState<BookingType | null>(null);
  const [petSpecies, setPetSpecies] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [contactMessage, setContactMessage] = useState(
    'Hallo, ich würde dich gern vorab kennenlernen und die Betreuung besprechen.'
  );
  const [contactSent, setContactSent] = useState(false);
  const createContact = useCreateContactRequest();
  const search =
    center === null ? null : { ...center, radiusKm, bookingType, petSpecies, dayOfWeek };
  const helpersQuery = useNearbyHelpers(search);
  const helpers = helpersQuery.data ?? [];
  const selected = helpers.find((helper) => helper.helper_id === selectedId) ?? null;

  const handleLocate = () => {
    setLocationError(null);
    void locate()
      .then((point) => {
        setCenter(point);
        setSelectedId(null);
      })
      .catch((error: unknown) =>
        setLocationError(
          error instanceof Error ? error.message : 'Standort konnte nicht bestimmt werden.'
        )
      );
  };

  const handlePlaceSearch = () => {
    setLocationError(null);
    setPlaceSearchPending(true);
    void searchOpenStreetMap(placeQuery)
      .then((results) => {
        setPlaceResults(results);
        if (results.length === 0) setLocationError('Kein passender Ort gefunden.');
      })
      .catch((error: unknown) => {
        setPlaceResults([]);
        setLocationError(
          error instanceof Error ? error.message : 'Ort konnte nicht gesucht werden.'
        );
      })
      .finally(() => setPlaceSearchPending(false));
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Entdecken</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-on-surface">
            Helfer:innen in der Nachbarschaft
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
            Finde verifizierte Unterstützung in deiner Nähe und lerne deine Nachbarschaft kennen.
          </p>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleLocate} className="btn-primary">
            {center ? 'Standort aktualisieren' : 'Standort verwenden'}
          </button>
          {RADII.map((radius) => (
            <button
              key={radius}
              type="button"
              onClick={() => setRadiusKm(radius)}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${radius === radiusKm ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'}`}
            >
              {radius.toString().replace('.', ',')} km
            </button>
          ))}
        </div>
        <div className="mb-6 rounded-2xl bg-surface-container-low p-4">
          <label className="mb-2 block text-sm font-bold" htmlFor="place-search">
            Ort oder PLZ manuell wählen
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="place-search"
              className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm"
              placeholder="z. B. 37581 oder Berlin"
              value={placeQuery}
              onChange={(event) => setPlaceQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handlePlaceSearch();
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={placeSearchPending || placeQuery.trim().length < 3}
              onClick={handlePlaceSearch}
            >
              {placeSearchPending ? 'Suche …' : 'Ort suchen'}
            </button>
          </div>
          {placeResults.length > 0 ? (
            <div className="mt-3 space-y-2">
              {placeResults.map((result) => (
                <button
                  key={`${result.latitude}-${result.longitude}`}
                  type="button"
                  className="block w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-left text-sm hover:bg-surface-container"
                  onClick={() => {
                    setCenter({ latitude: result.latitude, longitude: result.longitude });
                    setSelectedId(null);
                    setPlaceResults([]);
                    setPlaceQuery(result.displayName);
                  }}
                >
                  {result.displayName}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mb-6 space-y-3 rounded-2xl bg-surface-container-low p-4">
          <p className="text-sm font-bold">Filter</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBookingType(null)}
              className={`chip ${bookingType === null ? 'chip-selected' : ''}`}
            >
              Alle Betreuungsarten
            </button>
            {BOOKING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBookingType(type)}
                className={`chip ${bookingType === type ? 'chip-selected' : ''}`}
              >
                {type === 'walk'
                  ? 'Gassi'
                  : type === 'feeding'
                    ? 'Füttern'
                    : type === 'vacation'
                      ? 'Urlaub'
                      : 'Tagesbetreuung'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPetSpecies(null)}
              className={`chip ${petSpecies === null ? 'chip-selected' : ''}`}
            >
              Alle Tierarten
            </button>
            {SPECIES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPetSpecies(value)}
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
              className={`chip ${dayOfWeek === null ? 'chip-selected' : ''}`}
            >
              Jeder Tag
            </button>
            {DAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => setDayOfWeek(index)}
                className={`chip ${dayOfWeek === index ? 'chip-selected' : ''}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        {locationError ? (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-error-container p-4 text-sm font-semibold text-on-error-container"
          >
            {locationError}
          </p>
        ) : null}
        {center === null ? (
          <section className="card p-12 text-center">
            <p className="text-5xl">📍</p>
            <h2 className="mt-4 text-2xl font-extrabold">Standort aktivieren</h2>
            <p className="mx-auto mt-2 max-w-md text-on-surface-variant">
              Erlaube deinen Standort, um Helfer:innen in deiner Nähe zu sehen.
            </p>
          </section>
        ) : helpersQuery.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Helfer:innen werden gesucht …</p>
        ) : helpersQuery.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-error">
            Suche fehlgeschlagen: {nearbyHelperErrorMessage(helpersQuery.error)}
          </p>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-low shadow-[var(--shadow-level-1)]">
                <OSMMap
                  center={center}
                  radiusKm={radiusKm}
                  helpers={helpers}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold">In deiner Nähe</h2>
                <span className="text-sm font-bold text-secondary">{helpers.length} Treffer</span>
              </div>
              {helpers.length === 0 ? (
                <div className="card p-6 text-sm text-on-surface-variant">
                  Keine verifizierten Helfer:innen in diesem Radius.
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
                    }}
                  />
                ))
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
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
