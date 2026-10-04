'use client';

import {
  useCreateMissingPetSighting,
  useMissingPetSightings,
  useNearbyMissingPets,
  useOwnPets,
  useUploadMissingPetSightingPhoto,
} from '@pfotennetz/supabase';
import { useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';
import { getCurrentBrowserLocation } from '../../../lib/location';

export default function MissingRadarPage() {
  const pets = useOwnPets();
  const reports = useNearbyMissingPets();
  const create = useCreateMissingPetSighting();
  const upload = useUploadMissingPetSightingPhoto();
  const [locationReady, setLocationReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<{ data: ArrayBuffer; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSightings = useMissingPetSightings(selectedId ?? undefined);
  const ownPetIds = new Set((pets.data ?? []).map((pet) => pet.id));

  const locateAndLoad = () => {
    setError(null);
    void getCurrentBrowserLocation()
      .then(() => setLocationReady(true))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Standort konnte nicht bestimmt werden.')
      );
  };
  const submit = async () => {
    if (!selectedId || !locationReady) return;
    try {
      const point = await getCurrentBrowserLocation();
      const sighting = await create.mutateAsync({
        missingPetId: selectedId,
        latitude: point.latitude,
        longitude: point.longitude,
        description,
        seenAt: new Date().toISOString(),
      });
      if (photo)
        await upload.mutateAsync({
          sightingId: sighting.id,
          fileData: photo.data,
          contentType: photo.type,
        });
      setDescription('');
      setPhoto(null);
      setSelectedId(null);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'Sichtung konnte nicht gespeichert werden.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/missing" backLabel="Vermisste Tiere" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">
          Nachbarschaft hilft
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">Vermissten-Radar</h1>
        <p className="mt-3 text-on-surface-variant">
          Aktive Suchmeldungen in deiner Nähe ansehen und Sichtungen mit Standort melden.
        </p>
        <section className="card mt-8 p-6">
          <button type="button" className="btn-primary" onClick={locateAndLoad}>
            {locationReady ? 'Standort aktualisieren' : 'Standort verwenden'}
          </button>
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-error-container p-4 text-on-error-container"
            >
              {error}
            </p>
          ) : null}
        </section>
        {!locationReady ? (
          <section className="card mt-6 p-6 text-on-surface-variant">
            Aktiviere deinen Standort, um Suchmeldungen in deiner Nähe zu sehen.
          </section>
        ) : reports.isPending ? (
          <p className="mt-8">Suchmeldungen werden geladen …</p>
        ) : reports.isError ? (
          <p className="mt-8 text-error">{reports.error.message}</p>
        ) : reports.data?.length ? (
          <div className="mt-6 space-y-4">
            {reports.data.map((report) => (
              <article key={report.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      {ownPetIds.has(report.pet_id) ? 'Deine Suchmeldung' : 'Vermisstes Tier'}
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Letzte Sichtung {new Date(report.last_seen_at).toLocaleString('de-DE')} ·
                      Suchradius {report.search_radius_km} km
                    </p>
                  </div>
                  <span className="rounded-full bg-error-container px-3 py-1 text-xs font-bold text-on-error-container">
                    AKTIV
                  </span>
                </div>
                {report.description ? <p className="mt-4">{report.description}</p> : null}
                <button
                  type="button"
                  className="btn-primary mt-5"
                  onClick={() => setSelectedId(report.id)}
                >
                  Sichtung melden
                </button>
              </article>
            ))}
          </div>
        ) : (
          <section className="card mt-6 p-6">Keine aktiven Suchmeldungen in deiner Nähe.</section>
        )}
        {selectedId ? (
          <section className="card mt-6 p-6">
            <h2 className="text-xl font-extrabold">Sichtung melden</h2>
            <textarea
              className="input mt-4 min-h-28"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Wo und wann hast du das Tier gesehen?"
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-4 block w-full rounded-xl border border-outline-variant/50 p-3 text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  void file
                    .arrayBuffer()
                    .then((data) => setPhoto({ data, type: file.type || 'image/jpeg' }));
              }}
            />
            <button
              type="button"
              className="btn-primary mt-4"
              disabled={create.isPending || upload.isPending}
              onClick={() => void submit()}
            >
              {create.isPending || upload.isPending ? 'Wird gespeichert …' : 'Sichtung speichern'}
            </button>
            <button type="button" className="btn-ghost ml-3" onClick={() => setSelectedId(null)}>
              Abbrechen
            </button>
            {selectedSightings.isPending ? (
              <p className="mt-6">Bisherige Sichtungen werden geladen …</p>
            ) : selectedSightings.data?.length ? (
              <div className="mt-6 space-y-3">
                <h3 className="font-extrabold">Bisherige Sichtungen</h3>
                {selectedSightings.data.map((sighting) => (
                  <div key={sighting.id} className="border-t border-outline-variant/30 pt-3">
                    <p className="text-sm font-bold">
                      {new Date(sighting.seen_at).toLocaleString('de-DE')}
                    </p>
                    <p>{sighting.description}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
