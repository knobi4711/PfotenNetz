'use client';

import {
  useCreateMissingPet,
  useOwnMissingPets,
  useOwnPets,
  useMarkMissingPetFound,
} from '@pfotennetz/supabase';
import Link from 'next/link';
import { WebHeader } from '../../components/WebHeader';
import { getCurrentBrowserLocation } from '../../lib/location';
import { useState } from 'react';

export default function MissingPetsPage() {
  const reports = useOwnMissingPets();
  const pets = useOwnPets();
  const create = useCreateMissingPet();
  const markFound = useMarkMissingPetFound();
  const [selectedPetId, setSelectedPetId] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const reportMissing = async () => {
    setCreateError(null);
    try {
      if (!selectedPetId) throw new Error('Bitte wähle zuerst ein Tier aus.');
      const point = await getCurrentBrowserLocation();
      await create.mutateAsync({
        petId: selectedPetId,
        latitude: point.latitude,
        longitude: point.longitude,
        description,
        lastSeenAt: new Date().toISOString(),
        radiusKm: 3,
      });
      setSelectedPetId('');
      setDescription('');
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Meldung konnte nicht gespeichert werden.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">
          Nachbarschaft hilft
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Vermisste Tiere</h1>
        <p className="mt-3 max-w-2xl text-on-surface-variant">
          Verwalte deine Suchmeldungen und prüfe eingegangene Sichtungen mit Fotos und Standort.
        </p>
        <section className="card mt-8 p-6">
          <h2 className="text-xl font-extrabold">Vermisstes Tier melden</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Der aktuelle Browserstandort wird als letzter bekannter Ort gespeichert. Der Suchradius
            beträgt 3 km.
          </p>
          <Link href="/missing/radar" className="btn-secondary mt-5 inline-flex">
            Vermissten-Radar öffnen
          </Link>
          <label className="mt-5 block text-sm font-bold">
            Tier auswählen
            <select
              className="input mt-1"
              value={selectedPetId}
              onChange={(event) => setSelectedPetId(event.target.value)}
            >
              <option value="">Bitte auswählen …</option>
              {pets.data
                ?.filter((pet) => !pet.is_deceased)
                .map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold">
            Beschreibung und besondere Merkmale
            <textarea
              className="input mt-1 min-h-28"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Fell, Halsband, letzte Sichtung …"
            />
          </label>
          {createError ? (
            <p role="alert" className="mt-4 text-sm text-error">
              {createError}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={create.isPending}
            onClick={() => void reportMissing()}
          >
            {create.isPending ? 'Meldung wird gespeichert …' : 'Als vermisst melden'}
          </button>
        </section>
        {reports.isPending || pets.isPending ? (
          <p className="mt-8">Suchmeldungen werden geladen …</p>
        ) : reports.isError ? (
          <p className="mt-8 rounded-xl bg-error-container p-4 font-semibold text-on-error-container">
            Suchmeldungen konnten nicht geladen werden: {reports.error.message}
          </p>
        ) : reports.data?.length ? (
          <div className="mt-8 grid gap-4">
            {reports.data.map((report) => {
              const pet = pets.data?.find((item) => item.id === report.pet_id);
              return (
                <article key={report.id} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold">{pet?.name ?? 'Vermisstes Tier'}</h2>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {report.status === 'active'
                          ? 'Aktive Suchmeldung'
                          : report.status === 'found'
                            ? 'Als gefunden markiert'
                            : 'Suchmeldung beendet'}{' '}
                        · Letzte Sichtung {new Date(report.last_seen_at).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <span className="rounded-full bg-error-container px-3 py-1 text-xs font-bold text-on-error-container">
                      {report.status === 'active' ? 'AKTIV' : report.status.toUpperCase()}
                    </span>
                  </div>
                  {report.description ? <p className="mt-4">{report.description}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={`/missing/${report.id}`} className="btn-primary">
                      Details und Sichtungen
                    </Link>
                    {report.status === 'active' ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={markFound.isPending}
                        onClick={() => markFound.mutate(report.id)}
                      >
                        Als gefunden markieren
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="card mt-8 p-6">
            <h2 className="text-xl font-extrabold">Noch keine Suchmeldungen</h2>
            <p className="mt-2 text-on-surface-variant">
              Erstelle eine Vermisstmeldung in der mobilen App, um hier Sichtungen zu verwalten.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
