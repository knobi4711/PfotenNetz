'use client';

import { useOwnPets, PET_SPECIES_LABELS, type PetSpecies } from '@pfotennetz/supabase';
import Image from 'next/image';
import { WebHeader } from '../../components/WebHeader';

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
