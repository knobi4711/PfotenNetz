'use client';

import {
  HAZARD_SEVERITY_LABELS,
  HAZARD_TYPE_LABELS,
  useCreateHazard,
  useUploadHazardPhoto,
  type HazardSeverity,
  type HazardType,
} from '@pfotennetz/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TYPES: HazardType[] = [
  'poison_bait',
  'glass_shards',
  'aggressive_dog',
  'wasp_nest',
  'trap',
  'other',
];
const SEVERITIES: HazardSeverity[] = ['low', 'medium', 'high', 'critical'];

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

export default function WebHazardReportPage() {
  const router = useRouter();
  const create = useCreateHazard();
  const upload = useUploadHazardPhoto();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<HazardType>('poison_bait');
  const [severity, setSeverity] = useState<HazardSeverity>('medium');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<{ data: ArrayBuffer; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setCurrentLocation = () => {
    setError(null);
    void locate()
      .then(setLocation)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Standort konnte nicht bestimmt werden.')
      );
  };
  const publish = async () => {
    setError(null);
    try {
      const point = location ?? (await locate());
      const hazard = await create.mutateAsync({
        type,
        severity,
        latitude: point.latitude,
        longitude: point.longitude,
        radiusKm: severity === 'critical' ? 1.5 : 0.5,
        address: address.trim() || null,
        description,
      });
      if (photo)
        await upload.mutateAsync({
          hazardId: hazard.id,
          fileData: photo.data,
          contentType: photo.type,
        });
      router.replace('/hazard/radar');
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'Gefahr konnte nicht veröffentlicht werden.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push('/hazard/radar')}
            className="text-xl font-extrabold text-on-surface"
          >
            🐾 PfotenNetz
          </button>
          <span className="text-sm font-bold text-on-surface-variant">Schritt {step} von 3</span>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">
            Nachbarschaft warnen
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Gefahr melden</h1>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
        {step === 1 ? (
          <section className="card p-7">
            <h2 className="text-2xl font-extrabold">Art und Ort</h2>
            <p className="mt-2 text-on-surface-variant">Was wurde entdeckt?</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {TYPES.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setType(value)}
                  className={`rounded-xl border p-4 text-left font-bold ${type === value ? 'border-primary bg-primary-fixed text-on-primary-fixed-variant' : 'border-outline-variant/50 hover:bg-surface-container'}`}
                >
                  {HAZARD_TYPE_LABELS[value]}
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={setCurrentLocation} className="btn-secondary">
                {location ? 'Fundort aktualisiert' : 'Aktuellen Fundort verwenden'}
              </button>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Adresse oder Ort (optional)"
                className="input max-w-md"
              />
            </div>
          </section>
        ) : null}
        {step === 2 ? (
          <section className="card p-7">
            <h2 className="text-2xl font-extrabold">Details und Foto</h2>
            <label className="mt-6 block text-sm font-bold">Dringlichkeit</label>
            <div className="mt-3 flex flex-wrap gap-2">
              {SEVERITIES.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setSeverity(value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${severity === value ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
                >
                  {HAZARD_SEVERITY_LABELS[value]}
                </button>
              ))}
            </div>
            <label className="mt-6 block text-sm font-bold" htmlFor="description">
              Beschreibung
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Beschreibe Fundort und Gefahr …"
              className="input mt-2 min-h-36 py-3"
            />
            <label className="mt-6 block text-sm font-bold" htmlFor="photo">
              Foto (optional)
            </label>
            <input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full rounded-xl border border-outline-variant/50 p-3 text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file
                  .arrayBuffer()
                  .then((data) => setPhoto({ data, type: file.type || 'image/jpeg' }));
              }}
            />
            {photo ? (
              <p className="mt-2 text-sm font-semibold text-secondary">Foto ausgewählt.</p>
            ) : null}
          </section>
        ) : null}
        {step === 3 ? (
          <section className="card p-7">
            <h2 className="text-2xl font-extrabold">Prüfen und veröffentlichen</h2>
            <div className="mt-6 space-y-3 rounded-xl bg-surface-container-low p-5">
              <p className="font-bold">{HAZARD_TYPE_LABELS[type]}</p>
              <p className="text-sm text-on-surface-variant">
                {HAZARD_SEVERITY_LABELS[severity]} · Warnradius{' '}
                {severity === 'critical' ? '1,5 km' : '500 m'}
              </p>
              <p className="text-sm text-on-surface-variant">
                {address ||
                  (location ? 'Aktueller Standort' : 'Standort wird beim Absenden bestimmt')}
              </p>
              <p className="text-sm text-on-surface-variant">
                {description || 'Keine weiteren Details angegeben.'}
              </p>
            </div>
            <p className="mt-5 text-sm leading-6 text-on-surface-variant">
              Die Meldung wird zunächst geprüft. Erst nach Freigabe wird sie als aktive Warnung im
              Radar angezeigt.
            </p>
          </section>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-error-container p-4 font-semibold text-on-error-container"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((value) => value - 1)}
              className="btn-ghost"
            >
              Zurück
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !location) {
                  setError('Bitte bestimme den Fundort.');
                  return;
                }
                setError(null);
                setStep((value) => value + 1);
              }}
              className="btn-primary"
            >
              Weiter
            </button>
          ) : (
            <button
              type="button"
              disabled={create.isPending || upload.isPending}
              onClick={() => void publish()}
              className="btn-emergency"
            >
              {create.isPending || upload.isPending
                ? 'Wird veröffentlicht …'
                : 'Gefahr veröffentlichen'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
