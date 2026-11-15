'use client';

import { PET_SPECIES_LABELS, type Pet, type PetSpecies } from '@pfotennetz/supabase';
import { TASSO_PHONE_NUMBER, TASSO_PHONE_URL } from '@pfotennetz/shared';
import Image from 'next/image';
import { calculatePetAge, formatEmergencyList } from '../lib/pet-emergency';
import { petSpeciesEmoji } from '../lib/pets';

function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!/^[+0-9][0-9 ()/.-]{5,}$/.test(trimmed)) return null;
  return `tel:${trimmed.replace(/[ ()/-]/g, '')}`;
}

/**
 * Full emergency card of one pet. Used by the helper view inside a booking, so
 * it renders the same medical data the owner can share via a public link.
 */
export function PetEmergencyCard({ pet }: { pet: Pet }) {
  const vetPhoneHref = telHref(pet.vet_phone);

  return (
    <section className="card mt-6 overflow-hidden">
      <div className="flex flex-col items-center gap-4 bg-primary-fixed p-6 text-center">
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
          <span className="text-6xl">{petSpeciesEmoji(pet.species)}</span>
        )}
        <div>
          <h2 className="text-2xl font-extrabold">{pet.name}</h2>
          <p>{PET_SPECIES_LABELS[pet.species as PetSpecies] ?? pet.species}</p>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-extrabold">Steckbrief</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Alter" value={calculatePetAge(pet.birth_date)} />
          <Info label="Rasse" value={pet.breed ?? 'Nicht angegeben'} />
          <Info label="Farbe" value={pet.color ?? 'Nicht angegeben'} />
          <Info label="Chipnummer" value={pet.microchip_number ?? 'Nicht angegeben'} />
          <Info label="Tasso-Nummer" value={pet.tasso_number ?? 'Nicht angegeben'} />
          <Info label="Tasso-Telefon" value={TASSO_PHONE_NUMBER} />
        </dl>
      </div>

      <div className="border-t border-outline-variant/30 p-6">
        <h3 className="text-lg font-extrabold">Medizinische Hinweise</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Medikamente" value={formatEmergencyList(pet.medications)} />
          <Info label="Allergien" value={formatEmergencyList(pet.allergies)} />
          <Info label="Tierarztpraxis" value={pet.vet_clinic ?? 'Nicht angegeben'} />
          {vetPhoneHref ? (
            <div>
              <dt className="text-sm font-bold text-on-surface-variant">Tierarzt-Telefon</dt>
              <dd className="mt-1">
                <a href={vetPhoneHref} className="font-bold text-primary underline">
                  {pet.vet_phone}
                </a>
              </dd>
            </div>
          ) : (
            <Info label="Tierarzt-Telefon" value={pet.vet_phone ?? 'Nicht angegeben'} />
          )}
          <Info label="Versicherung" value={pet.insurance_policy ?? 'Nicht angegeben'} />
        </dl>
        <div className="mt-4">
          <p className="text-sm font-bold text-on-surface-variant">Besonderes</p>
          <p className="mt-1 whitespace-pre-line text-on-surface">
            {pet.special_needs ?? 'Keine besonderen Hinweise hinterlegt.'}
          </p>
        </div>
      </div>

      {pet.tasso_number ? (
        <div className="px-6 pb-6">
          <a href={TASSO_PHONE_URL} className="btn-secondary inline-flex">
            Tasso anrufen
          </a>
        </div>
      ) : null}
    </section>
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
