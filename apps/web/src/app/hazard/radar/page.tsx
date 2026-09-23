'use client';

import {
  HAZARD_SEVERITY_LABELS,
  HAZARD_TYPE_LABELS,
  useActiveHazards,
  useHazardSubscription,
  type ActiveHazard,
} from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const RADII = [0.5, 1, 1.5, 3] as const;
const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low'] as const;
const TIME_RANGES = [2, 24, 168] as const;

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

function point(
  center: { latitude: number; longitude: number },
  hazard: ActiveHazard,
  radius: number
) {
  const latitudeKm = (hazard.latitude - center.latitude) * 111.32;
  const longitudeKm =
    (hazard.longitude - center.longitude) * 111.32 * Math.cos((center.latitude * Math.PI) / 180);
  const clamp = (value: number) => Math.min(94, Math.max(6, value));
  return {
    left: `${clamp(50 + (longitudeKm / Math.max(radius, 0.5)) * 42)}%`,
    top: `${clamp(50 - (latitudeKm / Math.max(radius, 0.5)) * 42)}%`,
  };
}

function hazardColor(severity: string): string {
  if (severity === 'critical' || severity === 'high') return 'bg-error text-on-error';
  if (severity === 'medium') return 'bg-primary text-on-primary';
  return 'bg-secondary text-on-secondary';
}

export default function WebHazardRadarPage() {
  const router = useRouter();
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
      </header>
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
              <div className="relative h-[560px] overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-low shadow-[var(--shadow-level-1)]">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      'linear-gradient(var(--color-outline-variant) 1px, transparent 1px), linear-gradient(90deg, var(--color-outline-variant) 1px, transparent 1px)',
                    backgroundSize: '84px 84px',
                  }}
                />
                <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-error/40 bg-error/5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-surface bg-secondary text-xs font-bold text-on-secondary">
                    Du
                  </span>
                </div>
                {hazards.map((hazard) => (
                  <button
                    type="button"
                    key={hazard.id}
                    onClick={() => router.push(`/hazard/${hazard.id}`)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-4 border-surface text-lg font-extrabold shadow-lg ${hazardColor(hazard.severity)}`}
                    style={point(center, hazard, radius)}
                    aria-label={`${HAZARD_TYPE_LABELS[hazard.type as keyof typeof HAZARD_TYPE_LABELS]} öffnen`}
                  >
                    !
                  </button>
                ))}
                <span className="absolute right-5 top-5 rounded-lg bg-surface-container-lowest/90 px-3 py-2 text-xs font-bold text-on-surface-variant">
                  {hazards.length} Warnungen · ±{radius} km
                </span>
                <span className="absolute bottom-5 left-5 rounded-lg bg-surface-container-lowest/90 px-3 py-2 text-xs font-bold text-on-surface-variant">
                  Norden ↑
                </span>
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
