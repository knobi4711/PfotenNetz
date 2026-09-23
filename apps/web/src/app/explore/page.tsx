'use client';

import { useNearbyHelpers, type NearbyHelper } from '@pfotennetz/supabase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const RADII = [1.5, 3, 5, 10] as const;

function projectPoint(
  center: { latitude: number; longitude: number },
  helper: NearbyHelper,
  radiusKm: number
) {
  const latitudeKm = (helper.latitude - center.latitude) * 111.32;
  const longitudeKm =
    (helper.longitude - center.longitude) * 111.32 * Math.cos((center.latitude * Math.PI) / 180);
  const clamp = (value: number) => Math.min(94, Math.max(6, value));
  return {
    left: `${clamp(50 + (longitudeKm / Math.max(radiusKm, 0.5)) * 42)}%`,
    top: `${clamp(50 - (latitudeKm / Math.max(radiusKm, 0.5)) * 42)}%`,
  };
}

function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Standortfreigabe wird von diesem Browser nicht unterstützt.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error('Standort konnte nicht bestimmt werden.')),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
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
  const search = center === null ? null : { ...center, radiusKm };
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

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
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
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm font-bold text-primary"
          >
            ← Zum Dashboard
          </button>
        </div>
      </header>
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
              Erlaube deinen Standort, um Helfer:innen im gewählten Radius zu sehen.
            </p>
          </section>
        ) : helpersQuery.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Helfer:innen werden gesucht …</p>
        ) : helpersQuery.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-error">
            Suche fehlgeschlagen: {helpersQuery.error.message}
          </p>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="relative h-[520px] overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-low shadow-[var(--shadow-level-1)]">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      'linear-gradient(var(--color-outline-variant) 1px, transparent 1px), linear-gradient(90deg, var(--color-outline-variant) 1px, transparent 1px)',
                    backgroundSize: '72px 72px',
                  }}
                />
                <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-surface bg-secondary text-xs font-bold text-on-secondary">
                    Du
                  </span>
                </div>
                {helpers.map((helper) => {
                  const point = projectPoint(center, helper, radiusKm);
                  return (
                    <button
                      type="button"
                      key={helper.helper_id}
                      onClick={() => setSelectedId(helper.helper_id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface px-3 py-2 text-xs font-extrabold shadow-md ${selectedId === helper.helper_id ? 'z-10 bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'}`}
                      style={point}
                    >
                      {helper.display_name.slice(0, 1).toUpperCase()}
                    </button>
                  );
                })}
                <span className="absolute right-5 top-5 rounded-lg bg-surface-container-lowest/90 px-3 py-2 text-xs font-bold text-on-surface-variant">
                  Radius ±{radiusKm} km
                </span>
                <span className="absolute bottom-5 left-5 rounded-lg bg-surface-container-lowest/90 px-3 py-2 text-xs font-bold text-on-surface-variant">
                  Norden ↑
                </span>
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
                    onSelect={() => setSelectedId(helper.helper_id)}
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
                    Stelle hier später direkt eine verbindliche Betreuungsanfrage.
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-4 w-full"
                    onClick={() => router.push('/')}
                  >
                    Anfrage über Mobile-App öffnen
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
