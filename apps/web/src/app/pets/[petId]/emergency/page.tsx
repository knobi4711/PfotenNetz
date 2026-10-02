'use client';

import {
  createEmergencyCardLink,
  getSupabaseClient,
  PET_SPECIES_LABELS,
  useOwnEmergencyCardLinks,
  useOwnPets,
  useRevokeEmergencyCardLink,
  type PetSpecies,
} from '@pfotennetz/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { WebHeader } from '../../../../components/WebHeader';

function age(birthDate: string | null): string {
  if (!birthDate) return 'Nicht angegeben';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 'Nicht angegeben';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    years -= 1;
  }
  return years >= 0 ? `${years} Jahre` : 'Nicht angegeben';
}

function list(value: unknown): string {
  if (!Array.isArray(value)) return 'Keine Angaben';
  const values = value.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  );
  return values.length ? values.join(', ') : 'Keine Angaben';
}

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function EmergencyCardPage() {
  const { petId } = useParams<{ petId: string }>();
  const pets = useOwnPets();
  const links = useOwnEmergencyCardLinks();
  const revoke = useRevokeEmergencyCardLink();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pet = pets.data?.find((candidate) => candidate.id === petId);
  const activeLinks = links.data?.filter(
    (link) =>
      link.pet_id === petId && link.revoked_at === null && new Date(link.expires_at) > new Date()
  );

  const share = async () => {
    if (!pet) return;
    setPending(true);
    setMessage(null);
    try {
      const token = createToken();
      await createEmergencyCardLink(getSupabaseClient(), pet.id, token);
      const url = `${window.location.origin}/emergency/${token}`;
      if (navigator.share) {
        await navigator.share({ title: `Notfallkarte ${pet.name}`, text: url });
        setMessage('Notfallkarten-Link wurde geteilt.');
      } else {
        await navigator.clipboard.writeText(url);
        setMessage('Notfallkarten-Link wurde in die Zwischenablage kopiert.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(error instanceof Error ? error.message : 'Link konnte nicht erstellt werden.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/pets" backLabel="Meine Haustiere" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        {pets.isPending ? <p>Notfallkarte wird geladen …</p> : null}
        {!pets.isPending && !pet ? (
          <section className="card p-6">
            <h1 className="text-2xl font-extrabold">Tierprofil nicht gefunden</h1>
            <Link href="/pets" className="btn-secondary mt-5 inline-flex">
              Zurück zu den Haustieren
            </Link>
          </section>
        ) : pet ? (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">
              Sicher teilen
            </p>
            <h1 className="mt-2 text-4xl font-extrabold">Notfallkarte für {pet.name}</h1>
            <p className="mt-3 text-on-surface-variant">
              Teile nur die medizinischen Informationen, die für einen Notfall nötig sind. Der
              öffentliche Link ist 30 Tage gültig und kann jederzeit widerrufen werden.
            </p>

            <section className="card mt-8 overflow-hidden">
              <div className="flex items-center gap-5 bg-primary-fixed p-6">
                {pet.avatar_url ? (
                  <Image
                    src={pet.avatar_url}
                    alt={`Foto von ${pet.name}`}
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">
                    {pet.species === 'cat' ? '🐱' : pet.species === 'dog' ? '🐶' : '🐾'}
                  </span>
                )}
                <div>
                  <h2 className="text-2xl font-extrabold">{pet.name}</h2>
                  <p>{PET_SPECIES_LABELS[pet.species as PetSpecies] ?? pet.species}</p>
                </div>
              </div>
              <dl className="grid gap-4 p-6 sm:grid-cols-2">
                <Info label="Alter" value={age(pet.birth_date)} />
                <Info label="Rasse" value={pet.breed ?? 'Nicht angegeben'} />
                <Info label="Chipnummer" value={pet.microchip_number ?? 'Nicht angegeben'} />
                <Info label="Medikamente" value={list(pet.medications)} />
                <Info label="Allergien" value={list(pet.allergies)} />
                <Info
                  label="Tierarzt"
                  value={`${pet.vet_clinic ?? 'Nicht angegeben'} · ${pet.vet_phone ?? 'Keine Telefonnummer'}`}
                />
                <Info label="Versicherung" value={pet.insurance_policy ?? 'Nicht angegeben'} />
                <Info label="Besonderes" value={pet.special_needs ?? 'Keine Angaben'} />
              </dl>
            </section>

            {message ? (
              <p
                role="status"
                className="mt-4 rounded-xl bg-success-container p-4 text-on-success-container"
              >
                {message}
              </p>
            ) : null}
            <button
              type="button"
              className="btn-primary mt-5"
              disabled={pending}
              onClick={() => void share()}
            >
              {pending ? 'Sicherer Link wird erstellt …' : 'Notfallkarte sicher teilen'}
            </button>

            {activeLinks?.length ? (
              <section className="card mt-6 p-6">
                <h2 className="text-xl font-extrabold">Aktive Freigaben</h2>
                {activeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 pt-4"
                  >
                    <p className="text-sm">
                      Gültig bis {new Date(link.expires_at).toLocaleDateString('de-DE')}
                    </p>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(link.id)}
                    >
                      Freigabe widerrufen
                    </button>
                  </div>
                ))}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-bold text-on-surface-variant">{label}</dt>
      <dd className="mt-1 text-on-surface">{value}</dd>
    </div>
  );
}
