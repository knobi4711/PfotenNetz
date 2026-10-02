'use client';

import {
  PET_SPECIES_OPTIONS,
  useOwnPets,
  useCreatePet,
  useUpdatePet,
  useUploadPetPhoto,
  useSetPetActive,
  useSetPetDeceased,
  PET_SPECIES_LABELS,
  type Pet,
  type PetSpecies,
} from '@pfotennetz/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { WebHeader } from '../../components/WebHeader';
import { useState, type ChangeEvent } from 'react';

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function PetEditor({ pet, onClose }: { pet: Pet | null; onClose: () => void }) {
  const create = useCreatePet();
  const update = useUpdatePet();
  const [name, setName] = useState(pet?.name ?? '');
  const [species, setSpecies] = useState<PetSpecies>((pet?.species as PetSpecies) ?? 'dog');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [color, setColor] = useState(pet?.color ?? '');
  const [specialNeeds, setSpecialNeeds] = useState(pet?.special_needs ?? '');
  const [birthDate, setBirthDate] = useState(pet?.birth_date ?? '');
  const [microchipNumber, setMicrochipNumber] = useState(pet?.microchip_number ?? '');
  const [insurancePolicy, setInsurancePolicy] = useState(pet?.insurance_policy ?? '');
  const [vetClinic, setVetClinic] = useState(pet?.vet_clinic ?? '');
  const [vetPhone, setVetPhone] = useState(pet?.vet_phone ?? '');
  const [medications, setMedications] = useState(stringList(pet?.medications).join(', '));
  const [allergies, setAllergies] = useState(pet?.allergies?.join(', ') ?? '');
  const mutation = pet === null ? create : update;

  const save = () => {
    const input = {
      name,
      species,
      breed: breed || null,
      color: color || null,
      specialNeeds: specialNeeds || null,
      birthDate: birthDate || null,
      microchipNumber,
      insurancePolicy,
      vetClinic,
      vetPhone,
      medications: medications
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      allergies: allergies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    };
    if (pet === null) create.mutate(input, { onSuccess: onClose });
    else update.mutate({ ...input, petId: pet.id }, { onSuccess: onClose });
  };

  return (
    <section className="card mt-8 p-7">
      <h2 className="text-xl font-extrabold">{pet === null ? 'Neues Tier' : 'Tier bearbeiten'}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Name
          <input
            className="input mt-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Tierart
          <select
            className="input mt-1"
            value={species}
            onChange={(event) => setSpecies(event.target.value as PetSpecies)}
          >
            {PET_SPECIES_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PET_SPECIES_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Rasse
          <input
            className="input mt-1"
            value={breed}
            onChange={(event) => setBreed(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Farbe
          <input
            className="input mt-1"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Geburtsdatum
          <input
            type="date"
            className="input mt-1"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Chipnummer
          <input
            className="input mt-1"
            value={microchipNumber}
            onChange={(event) => setMicrochipNumber(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Versicherungspolice
          <input
            className="input mt-1"
            value={insurancePolicy}
            onChange={(event) => setInsurancePolicy(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Tierarztpraxis
          <input
            className="input mt-1"
            value={vetClinic}
            onChange={(event) => setVetClinic(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Tierarzt-Telefon
          <input
            type="tel"
            className="input mt-1"
            value={vetPhone}
            onChange={(event) => setVetPhone(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Medikamente
          <input
            className="input mt-1"
            placeholder="Kommagetrennt"
            value={medications}
            onChange={(event) => setMedications(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Allergien
          <input
            className="input mt-1"
            placeholder="Kommagetrennt"
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold sm:col-span-2">
          Besonderer Betreuungsbedarf
          <textarea
            className="input mt-1 min-h-24"
            value={specialNeeds}
            onChange={(event) => setSpecialNeeds(event.target.value)}
          />
        </label>
      </div>
      {mutation.isError ? (
        <p role="alert" className="mt-4 text-sm text-error">
          Speichern fehlgeschlagen: {mutation.error.message}
        </p>
      ) : null}
      <div className="mt-5 flex gap-3">
        <button type="button" className="btn-primary" disabled={mutation.isPending} onClick={save}>
          {mutation.isPending ? 'Wird gespeichert …' : 'Speichern'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          Abbrechen
        </button>
      </div>
    </section>
  );
}

function PetHealthEditor({ pet }: { pet: Pet }) {
  const update = useUpdatePet();
  const [open, setOpen] = useState(false);
  const [medications, setMedications] = useState(stringList(pet.medications).join(', '));
  const [allergies, setAllergies] = useState(pet.allergies?.join(', ') ?? '');
  const [vetClinic, setVetClinic] = useState(pet.vet_clinic ?? '');
  const [vetPhone, setVetPhone] = useState(pet.vet_phone ?? '');

  const save = () => {
    const list = (value: string) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    update.mutate({
      petId: pet.id,
      name: pet.name,
      species: pet.species as PetSpecies,
      breed: pet.breed,
      color: pet.color,
      specialNeeds: pet.special_needs,
      birthDate: pet.birth_date,
      microchipNumber: pet.microchip_number,
      insurancePolicy: pet.insurance_policy,
      medications: list(medications),
      allergies: list(allergies),
      vetClinic,
      vetPhone,
    });
  };

  return (
    <section className="mt-6 border-t border-outline-variant/30 pt-5">
      <button
        type="button"
        className="text-sm font-bold text-primary"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? 'Gesundheitsdaten schließen' : 'Gesundheitsdaten bearbeiten'}
      </button>
      {open ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-bold">
            Medikamente
            <input
              value={medications}
              onChange={(event) => setMedications(event.target.value)}
              placeholder="z. B. Insulin, Schilddrüsenmittel"
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-bold">
            Allergien
            <input
              value={allergies}
              onChange={(event) => setAllergies(event.target.value)}
              placeholder="Kommagetrennte Liste"
              className="input mt-1"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Tierarztpraxis
              <input
                value={vetClinic}
                onChange={(event) => setVetClinic(event.target.value)}
                className="input mt-1"
              />
            </label>
            <label className="block text-sm font-bold">
              Tierarzt-Telefon
              <input
                type="tel"
                value={vetPhone}
                onChange={(event) => setVetPhone(event.target.value)}
                className="input mt-1"
              />
            </label>
          </div>
          {update.isError ? (
            <p role="alert" className="text-sm text-error">
              Gesundheitsdaten konnten nicht gespeichert werden: {update.error.message}
            </p>
          ) : null}
          <button type="button" className="btn-primary" disabled={update.isPending} onClick={save}>
            {update.isPending ? 'Wird gespeichert …' : 'Gesundheitsdaten speichern'}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PetStatusAndPhotoActions({ pet }: { pet: Pet }) {
  const uploadPhoto = useUploadPetPhoto();
  const setActive = useSetPetActive();
  const setDeceased = useSetPetDeceased();

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    uploadPhoto.mutate({
      petId: pet.id,
      fileData: await file.arrayBuffer(),
      contentType: file.type || 'image/jpeg',
    });
  };

  const pending = uploadPhoto.isPending || setActive.isPending || setDeceased.isPending;

  return (
    <div className="mt-5 border-t border-outline-variant/30 pt-5">
      <div className="flex flex-wrap gap-3">
        <label className="btn-secondary cursor-pointer">
          {uploadPhoto.isPending ? 'Bild wird gespeichert …' : 'Tierfoto auswählen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pending}
            onChange={(event) => void choosePhoto(event)}
          />
        </label>
        {!pet.is_deceased ? (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => setActive.mutate({ petId: pet.id, isActive: !pet.is_active })}
          >
            {pet.is_active ? 'Für Aufträge pausieren' : 'Für Aufträge aktivieren'}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => setDeceased.mutate({ petId: pet.id, isDeceased: !pet.is_deceased })}
        >
          {pet.is_deceased ? 'Als lebend markieren' : 'Als verstorben markieren'}
        </button>
      </div>
      {uploadPhoto.isError || setActive.isError || setDeceased.isError ? (
        <p role="alert" className="mt-3 text-sm text-error">
          Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.
        </p>
      ) : null}
    </div>
  );
}

function age(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let value = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    value -= 1;
  return value >= 0 ? `${value} Jahre` : null;
}

export default function PetsPage() {
  const pets = useOwnPets();
  const [editingPet, setEditingPet] = useState<Pet | null | undefined>(undefined);
  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">
          Meine Schutzlinge
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">Meine Haustiere</h1>
        <p className="mt-3 text-lg text-on-surface-variant">
          Alle wichtigen Informationen zu deinen Tieren an einem Ort.
        </p>
        <button type="button" className="btn-primary mt-5" onClick={() => setEditingPet(null)}>
          Neues Tier anlegen
        </button>
        {editingPet !== undefined ? (
          <PetEditor pet={editingPet} onClose={() => setEditingPet(undefined)} />
        ) : null}
        {pets.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Tierprofile werden geladen …</p>
        ) : pets.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Tierprofile konnten nicht geladen werden: {pets.error.message}
          </p>
        ) : pets.data?.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {pets.data.map((pet) => (
              <article key={pet.id} className="card overflow-hidden">
                <div className="flex h-48 items-center justify-center bg-primary-fixed text-7xl">
                  {pet.avatar_url ? (
                    <Image
                      src={pet.avatar_url}
                      alt={`Foto von ${pet.name}`}
                      width={640}
                      height={384}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : pet.species === 'cat' ? (
                    '🐱'
                  ) : pet.species === 'dog' ? (
                    '🐶'
                  ) : (
                    '🐾'
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-extrabold text-on-surface">{pet.name}</h2>
                      <p className="mt-1 text-on-surface-variant">
                        {PET_SPECIES_LABELS[pet.species as PetSpecies] ?? pet.species}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${pet.is_deceased ? 'bg-error-container text-on-error-container' : pet.is_active ? 'bg-success-container text-on-success-container' : 'bg-surface-container text-on-surface-variant'}`}
                    >
                      {pet.is_deceased ? 'Verstorben' : pet.is_active ? 'Aktiv' : 'Pausiert'}
                    </span>
                  </div>
                  <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="font-bold text-on-surface-variant">Alter</dt>
                      <dd className="mt-1 text-on-surface">
                        {age(pet.birth_date) ?? 'Nicht angegeben'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold text-on-surface-variant">Farbe</dt>
                      <dd className="mt-1 text-on-surface">{pet.color ?? 'Nicht angegeben'}</dd>
                    </div>
                  </dl>
                  {pet.special_needs ? (
                    <div className="mt-5 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface">
                      <strong>Besonderes:</strong> {pet.special_needs}
                    </div>
                  ) : null}
                  <PetStatusAndPhotoActions pet={pet} />
                  <PetHealthEditor pet={pet} />
                  <button
                    type="button"
                    className="btn-secondary mt-4"
                    onClick={() => setEditingPet(pet)}
                  >
                    Tier bearbeiten
                  </button>
                  <Link
                    href={`/pets/${pet.id}/emergency`}
                    className="btn-secondary mt-4 ml-3 inline-flex"
                  >
                    Notfallkarte
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="card mt-8 p-10 text-center">
            <p className="text-5xl">🐾</p>
            <h2 className="mt-4 text-xl font-extrabold text-on-surface">Noch kein Tierprofil</h2>
            <p className="mt-2 text-on-surface-variant">
              Lege dein erstes Tier in der Mobile-App an.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
