'use client';

import {
  useCreateMissingPetSighting,
  useMissingPetSightings,
  useOwnMissingPets,
  useOwnPets,
  useUploadMissingPetSightingPhoto,
} from '@pfotennetz/supabase';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { WebHeader } from '../../../components/WebHeader';

function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Standortfreigabe wird von diesem Browser nicht unterstützt.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Standort konnte nicht bestimmt werden.')),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  });
}

export default function MissingPetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reports = useOwnMissingPets();
  const pets = useOwnPets();
  const sightings = useMissingPetSightings(id);
  const createSighting = useCreateMissingPetSighting();
  const uploadPhoto = useUploadMissingPetSightingPhoto();
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<{ data: ArrayBuffer; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const report = reports.data?.find((item) => item.id === id);
  const pet = pets.data?.find((item) => item.id === report?.pet_id);

  const submitSighting = async () => {
    setError(null);
    try {
      const point = await locate();
      const sighting = await createSighting.mutateAsync({
        missingPetId: id,
        latitude: point.latitude,
        longitude: point.longitude,
        description,
        seenAt: new Date().toISOString(),
      });
      if (photo) {
        await uploadPhoto.mutateAsync({
          sightingId: sighting.id,
          fileData: photo.data,
          contentType: photo.type,
        });
      }
      setDescription('');
      setPhoto(null);
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
        {reports.isPending ? <p>Suchmeldung wird geladen …</p> : null}
        {!reports.isPending && !report ? (
          <section className="card p-6">
            <h1 className="text-2xl font-extrabold">Suchmeldung nicht gefunden</h1>
            <Link href="/missing" className="btn-secondary mt-5 inline-flex">
              Zur Übersicht
            </Link>
          </section>
        ) : report ? (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">Suchmeldung</p>
            <h1 className="mt-2 text-4xl font-extrabold">{pet?.name ?? 'Vermisstes Tier'}</h1>
            <p className="mt-3 text-on-surface-variant">
              Letzte Sichtung {new Date(report.last_seen_at).toLocaleString('de-DE')} · Suchradius{' '}
              {report.search_radius_km} km
            </p>
            {report.description ? <p className="card mt-6 p-5">{report.description}</p> : null}

            <section className="card mt-6 p-6">
              <h2 className="text-xl font-extrabold">Neue Sichtung melden</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Der aktuelle Browserstandort wird zusammen mit der Meldung gespeichert.
              </p>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Wo und wann hast du das Tier gesehen?"
                className="input mt-4 min-h-32 py-3"
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-4 block w-full rounded-xl border border-outline-variant/50 p-3 text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void file.arrayBuffer().then((data) => setPhoto({ data, type: file.type }));
                }}
              />
              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-error-container p-4 font-semibold text-on-error-container"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="btn-primary mt-4"
                disabled={createSighting.isPending || uploadPhoto.isPending}
                onClick={() => void submitSighting()}
              >
                {createSighting.isPending || uploadPhoto.isPending
                  ? 'Wird gespeichert …'
                  : 'Sichtung speichern'}
              </button>
            </section>

            <section className="card mt-6 p-6">
              <h2 className="text-xl font-extrabold">Sichtungsverlauf</h2>
              {sightings.isPending ? <p className="mt-4">Sichtungen werden geladen …</p> : null}
              {sightings.isError ? (
                <p className="mt-4 text-error">{sightings.error.message}</p>
              ) : null}
              {sightings.data?.length ? (
                <div className="mt-4 divide-y divide-outline-variant/30">
                  {sightings.data.map((sighting) => (
                    <article key={sighting.id} className="py-4 first:pt-0">
                      <p className="text-sm font-bold">
                        {new Date(sighting.seen_at).toLocaleString('de-DE')}
                      </p>
                      {sighting.description ? <p className="mt-2">{sighting.description}</p> : null}
                      {sighting.photoUrls.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {sighting.photoUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary"
                            >
                              Foto ansehen
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : !sightings.isPending && !sightings.isError ? (
                <p className="mt-4 text-on-surface-variant">Noch keine Sichtungen vorhanden.</p>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
