'use client';

import {
  HAZARD_SEVERITY_LABELS,
  HAZARD_TYPE_LABELS,
  useActiveHazards,
  useHazardSubscription,
  useOwnProfile,
  type ActiveHazard,
} from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';

const RADII = [0.5, 1, 1.5, 3] as const;
const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low'] as const;
const TIME_RANGES = [2, 24, 168] as const;

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
};
type LeafletLayerGroup = { addTo: (map: LeafletMap) => LeafletLayerGroup; clearLayers: () => void };
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
  const script =
    document.querySelector<HTMLScriptElement>('script[data-pfotennetz-leaflet]') ??
    document.createElement('script');
  if (!script.src) {
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.dataset.pfotennetzLeaflet = 'true';
    document.head.appendChild(script);
  }
  return new Promise((resolve, reject) => {
    const check = () => {
      const leaflet = (window as unknown as { L?: LeafletApi }).L;
      if (leaflet) resolve(leaflet);
      else window.setTimeout(check, 50);
    };
    script.addEventListener('load', check, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Kartenbibliothek konnte nicht geladen werden.')),
      { once: true }
    );
    check();
  });
}

function hazardColor(severity: string): string {
  if (severity === 'critical' || severity === 'high') return 'bg-error text-on-error';
  if (severity === 'medium') return 'bg-primary text-on-primary';
  return 'bg-secondary text-on-secondary';
}

function OSMHazardMap({
  center,
  radiusKm,
  hazards,
  onOpen,
}: {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  hazards: ActiveHazard[];
  onOpen: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<LeafletLayerGroup | null>(null);
  useEffect(() => {
    const link = 'pfotennetz-leaflet-css';
    if (!document.getElementById(link)) {
      const stylesheet = document.createElement('link');
      stylesheet.id = link;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(stylesheet);
    }
    let disposed = false;
    void loadLeaflet().then((leaflet) => {
      if (disposed || !ref.current) return;
      const fresh = !map.current;
      map.current = map.current ?? leaflet.map(ref.current);
      map.current.setView(
        [center.latitude, center.longitude],
        Math.max(10, Math.round(15 - Math.log2(radiusKm)))
      );
      layers.current = layers.current ?? leaflet.layerGroup().addTo(map.current);
      layers.current.clearLayers();
      if (fresh)
        leaflet
          .tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap-Mitwirkende',
          })
          .addTo(map.current);
      leaflet
        .circle([center.latitude, center.longitude], {
          radius: radiusKm * 1000,
          color: '#ba1a1a',
          fillColor: '#ba1a1a',
          fillOpacity: 0.1,
        })
        .addTo(map.current);
      hazards.forEach((hazard) => {
        const marker = leaflet
          .marker([hazard.latitude, hazard.longitude])
          .addTo(layers.current as LeafletLayerGroup)
          .bindPopup(
            `${HAZARD_TYPE_LABELS[hazard.type as keyof typeof HAZARD_TYPE_LABELS]} · ${HAZARD_SEVERITY_LABELS[hazard.severity as keyof typeof HAZARD_SEVERITY_LABELS]}`
          );
        marker.on('click', () => onOpen(hazard.id));
      });
    });
    return () => {
      disposed = true;
    };
  }, [center, radiusKm, hazards, onOpen]);
  useEffect(() => () => map.current?.remove(), []);
  return (
    <div
      ref={ref}
      className="h-[560px] w-full rounded-3xl"
      aria-label="OpenStreetMap-Gefahrenkarte"
    />
  );
}

function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error('Standortfreigabe wird nicht unterstützt.'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Standort konnte nicht bestimmt werden.')),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  });
}

export default function WebHazardRadarPage() {
  const router = useRouter();
  const profile = useOwnProfile();
  useHazardSubscription();
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radius, setRadius] = useState<(typeof RADII)[number]>(1.5);
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>('all');
  const [hours, setHours] = useState<(typeof TIME_RANGES)[number]>(24);
  const [error, setError] = useState<string | null>(null);
  const query = useActiveHazards(center === null ? null : { ...center, radiusKm: radius });
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const hazards = (query.data ?? []).filter(
    (hazard) =>
      (severity === 'all' || hazard.severity === severity) &&
      new Date(hazard.created_at).getTime() >= cutoff
  );

  const handleLocate = () => {
    setError(null);
    void locate()
      .then(setCenter)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Standort konnte nicht bestimmt werden.')
      );
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader
        backHref="/"
        backLabel="Dashboard"
        rightContent={
          <button
            type="button"
            onClick={() => router.push('/explore')}
            className="text-sm font-bold text-on-surface-variant"
          >
            Helfer:innen
          </button>
        }
      />
      {/*
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 lg:px-10">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-3 text-xl font-extrabold text-on-surface"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-xl">
              🐾
            </span>
            PfotenNetz
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm font-bold text-primary"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push('/explore')}
              className="text-sm font-bold text-on-surface-variant"
            >
              Helfer:innen
            </button>
          </div>
        </div>
      </header>*/}
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">Sicherheit</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-on-surface">
              Nachbarschafts-Gefahrenradar
            </h1>
            <p className="mt-3 text-lg text-on-surface-variant">
              Aktive Warnungen in deinem gewählten Radius.
            </p>
          </div>
          <button
            type="button"
            className="btn-emergency"
            onClick={() => router.push('/hazard/report')}
          >
            Gefahr melden
          </button>
          {profile.data?.role === 'admin' ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push('/hazard/moderation')}
            >
              Meldungen prüfen
            </button>
          ) : null}
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={handleLocate}>
            {center ? 'Standort aktualisieren' : 'Standort verwenden'}
          </button>
          {RADII.map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setRadius(value)}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${radius === value ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'}`}
            >
              {value.toString().replace('.', ',')} km
            </button>
          ))}
        </div>
        {error ? (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-error-container p-4 font-semibold text-on-error-container"
          >
            {error}
          </p>
        ) : null}
        {center === null ? (
          <section className="card p-14 text-center">
            <p className="text-5xl">⚠️</p>
            <h2 className="mt-4 text-2xl font-extrabold text-on-surface">
              Standort für das Radar aktivieren
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-on-surface-variant">
              Wir zeigen nur Warnungen in deiner Nähe und geben deinen genauen Standort nicht an
              andere Nutzer weiter.
            </p>
          </section>
        ) : query.isPending ? (
          <p className="py-14 text-center text-on-surface-variant">Gefahren werden geladen …</p>
        ) : query.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
            Radar konnte nicht geladen werden: {query.error.message}
          </p>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="mr-2 self-center text-sm font-bold text-on-surface-variant">
                Dringlichkeit:
              </span>
              {SEVERITIES.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setSeverity(value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${severity === value ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
                >
                  {value === 'all' ? 'Alle' : HAZARD_SEVERITY_LABELS[value]}
                </button>
              ))}
              <span className="mx-2 self-center text-sm font-bold text-on-surface-variant">
                Zeitraum:
              </span>
              {TIME_RANGES.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setHours(value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${hours === value ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'}`}
                >
                  {value === 2 ? '2 h' : value === 24 ? '24 h' : '7 Tage'}
                </button>
              ))}
            </div>
            <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-low shadow-[var(--shadow-level-1)]">
                <OSMHazardMap
                  center={center}
                  radiusKm={radius}
                  hazards={hazards}
                  onOpen={(id) => router.push(`/hazard/${id}`)}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-on-surface">Aktive Warnungen</h2>
                  <span className="text-sm font-bold text-secondary">{hazards.length} Treffer</span>
                </div>
                {hazards.length === 0 ? (
                  <div className="card p-6 text-sm text-on-surface-variant">
                    Keine aktiven Warnungen im ausgewählten Zeitraum.
                  </div>
                ) : (
                  hazards.map((hazard) => (
                    <button
                      type="button"
                      key={hazard.id}
                      onClick={() => router.push(`/hazard/${hazard.id}`)}
                      className="card w-full p-5 text-left hover:bg-surface-container-low"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-extrabold text-on-surface">
                          {HAZARD_TYPE_LABELS[hazard.type as keyof typeof HAZARD_TYPE_LABELS]}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${hazardColor(hazard.severity)}`}
                        >
                          {
                            HAZARD_SEVERITY_LABELS[
                              hazard.severity as keyof typeof HAZARD_SEVERITY_LABELS
                            ]
                          }
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        ca. {Number(hazard.distance_km).toLocaleString('de-DE')} km entfernt ·{' '}
                        {new Date(hazard.created_at).toLocaleString('de-DE')}
                      </p>
                      {hazard.description ? (
                        <p className="mt-2 text-sm text-on-surface">{hazard.description}</p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
