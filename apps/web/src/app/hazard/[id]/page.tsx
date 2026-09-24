'use client';

import {
  HAZARD_SEVERITY_LABELS,
  HAZARD_STATUS_LABELS,
  HAZARD_TYPE_LABELS,
  useCreateHazardSighting,
  useHazard,
} from '@pfotennetz/supabase';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';

function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error('Standortfreigabe wird nicht unterstützt.'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Standort konnte nicht bestimmt werden.')),
      { maximumAge: 300000, timeout: 10000 }
    );
  });
}

export default function WebHazardDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useHazard(params.id ?? null);
  const sighting = useCreateHazardSighting();
  const [error, setError] = useState<string | null>(null);
  const sendFeedback = (description: string) => {
    setError(null);
    void locate()
      .then((point) => {
        if (query.data)
          sighting.mutate({
            hazardId: query.data.id,
            latitude: point.latitude,
            longitude: point.longitude,
            description,
          });
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Standort konnte nicht bestimmt werden.')
      );
  };
  if (query.isPending)
    return (
      <main className="min-h-screen bg-surface p-10 text-center text-on-surface-variant">
        Gefahr wird geladen …
      </main>
    );
  if (query.isError || !query.data)
    return (
      <main className="min-h-screen bg-surface p-10">
        <p
          role="alert"
          className="mx-auto max-w-2xl rounded-xl bg-error-container p-4 text-on-error-container"
        >
          Gefahr konnte nicht geladen werden: {query.error?.message ?? 'Nicht gefunden'}
        </p>
      </main>
    );
  const hazard = query.data;
  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/hazard/radar" backLabel="Gefahrenradar" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">
          Warnung {hazard.hazard_number}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">
          {HAZARD_TYPE_LABELS[hazard.type]}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-error px-4 py-2 text-sm font-bold text-on-error">
            {HAZARD_SEVERITY_LABELS[hazard.severity]}
          </span>
          <span className="inline-flex rounded-full bg-surface-container px-4 py-2 text-sm font-bold text-on-surface-variant">
            {HAZARD_STATUS_LABELS[hazard.status]}
          </span>
        </div>
        {hazard.status === 'active' ? (
          <p className="mt-5 rounded-xl bg-secondary-container p-4 font-semibold text-on-secondary-container">
            Diese Meldung ist veröffentlicht und wird im Gefahrenradar angezeigt.
          </p>
        ) : null}
        <section className="card mt-6 p-7">
          <p className="text-sm text-on-surface-variant">
            {hazard.address ?? 'Standort in deiner Nachbarschaft'} · Warnradius {hazard.radius_km}{' '}
            km
          </p>
          {hazard.description ? (
            <p className="mt-5 text-lg leading-8 text-on-surface">{hazard.description}</p>
          ) : null}
          {hazard.photos.length ? (
            <p className="mt-5 text-sm font-semibold text-secondary">
              {hazard.photos.length} Foto(s) zur Meldung vorhanden.
            </p>
          ) : null}
        </section>
        <section className="card mt-6 p-7">
          <h2 className="text-2xl font-extrabold text-on-surface">Was ist vor Ort?</h2>
          <p className="mt-3 leading-7 text-on-surface-variant">
            Deine Rückmeldung hilft, die Lage aktuell zu halten.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={sighting.isPending}
              onClick={() => sendFeedback('Bereich gesäubert')}
              className="btn-secondary"
            >
              Bereich gesäubert
            </button>
            <button
              type="button"
              disabled={sighting.isPending}
              onClick={() => sendFeedback('Gefahr besteht weiterhin')}
              className="btn-emergency"
            >
              Gefahr besteht weiterhin
            </button>
          </div>
          {sighting.isSuccess ? (
            <p className="mt-4 font-semibold text-secondary">
              Danke, deine Rückmeldung wurde gespeichert.
            </p>
          ) : null}
          {sighting.isError ? (
            <p role="alert" className="mt-4 text-sm font-semibold text-error">
              Rückmeldung fehlgeschlagen: {sighting.error.message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-4 text-sm font-semibold text-error">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
