'use client';

import {
  BOOKING_TYPES,
  isBookingCoveredByAvailabilities,
  useCreateBooking,
  useHelperDetail,
  useOwnPets,
  type BookingCurrency,
  type BookingType,
  type CareLocation,
} from '@pfotennetz/supabase';
import { BOOKING_TYPE_LABELS } from '@pfotennetz/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';

function NewBookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const helperId = params.get('helperId');
  const helper = useHelperDetail(helperId);
  const pets = useOwnPets();
  const create = useCreateBooking();
  const [petIds, setPetIds] = useState<string[]>([]);
  const [petsOpen, setPetsOpen] = useState(false);
  const [type, setType] = useState<BookingType>('walk');
  const [careLocation, setCareLocation] = useState<CareLocation>('at_owner_home');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [currency, setCurrency] = useState<BookingCurrency>('KIEZ_HOURS');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [safety, setSafety] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const activePets = (pets.data ?? []).filter((pet) => pet.is_active && !pet.is_deceased);

  const submit = () => {
    setFormError(null);
    if (petIds.length === 0) return setFormError('Bitte wähle mindestens ein Tier aus.');
    if (!start || !end || new Date(end).getTime() <= new Date(start).getTime())
      return setFormError('Bitte wähle einen gültigen Zeitraum.');
    if (!safety) return setFormError('Bitte bestätige die Sicherheitshinweise.');
    const amount = Number(price.replace(',', '.'));
    if (
      (currency === 'EUR' || currency === 'PER_VISIT') &&
      (!Number.isFinite(amount) || amount <= 0)
    )
      return setFormError('Bitte gib einen Preis über 0 € an.');
    if (currency === 'KIEZ_HOURS' && (!Number.isFinite(amount) || amount < 0))
      return setFormError('Bitte gib gültige Nachbarschafts-Stunden an.');
    if (
      helper.data &&
      !isBookingCoveredByAvailabilities(helper.data.slots, {
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        type,
      })
    )
      return setFormError('Der Zeitraum liegt außerhalb der Verfügbarkeit dieses Helfers.');
    create.mutate(
      {
        type,
        petIds,
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        helperId,
        meetingAddress: address.trim() || null,
        currency,
        priceEur: currency === 'EUR' || currency === 'PER_VISIT' ? amount : undefined,
        priceKiezHours: currency === 'KIEZ_HOURS' ? amount : undefined,
        isUrgent: urgent,
        careNotes: notes.trim() || null,
        careLocation,
      },
      { onSuccess: (booking) => router.replace(`/booking/${booking.id}`) }
    );
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/explore" backLabel="Helfersuche" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Betreuung</p>
        <h1 className="mt-2 text-4xl font-extrabold">Neue Betreuung buchen</h1>
        {helperId && helper.data ? (
          <p className="mt-3 text-on-surface-variant">
            Anfrage an <strong>{helper.data.display_name}</strong>
          </p>
        ) : null}
        {helper.isError ? (
          <p className="mt-4 text-error">
            Helfer:in konnte nicht geladen werden: {helper.error.message}
          </p>
        ) : null}
        <div className="mt-8 space-y-6">
          <section className="card p-7">
            <h2 className="text-xl font-extrabold">Tier und Leistung</h2>
            {pets.isError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-error-container p-4 text-on-error-container"
              >
                Deine Tiere konnten nicht geladen werden: {pets.error.message}
              </p>
            ) : activePets.length === 0 && !pets.isPending ? (
              <p className="mt-4 rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
                Du hast noch kein aktives Tier. Lege zuerst unter „Meine Tiere“ ein Tier an oder
                aktiviere ein vorhandenes.
              </p>
            ) : null}
            <div className="relative mt-4">
              <p className="text-sm font-bold">Tiere</p>
              <button
                type="button"
                className="input mt-1 flex w-full items-center justify-between text-left"
                aria-expanded={petsOpen}
                aria-haspopup="listbox"
                onClick={() => setPetsOpen((open) => !open)}
              >
                <span>
                  {petIds.length === 0
                    ? 'Bitte auswählen …'
                    : petIds.length === activePets.length
                      ? 'Alle Tiere'
                      : activePets
                          .filter((pet) => petIds.includes(pet.id))
                          .map((pet) => pet.name)
                          .join(', ')}
                </span>
                <span aria-hidden="true">⌄</span>
              </button>
              {petsOpen ? (
                <div
                  role="listbox"
                  aria-multiselectable="true"
                  className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-outline-variant/40 bg-surface p-2 shadow-[var(--shadow-level-2)]"
                >
                  <label className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={activePets.length > 0 && petIds.length === activePets.length}
                      onChange={(event) =>
                        setPetIds(event.target.checked ? activePets.map((pet) => pet.id) : [])
                      }
                      className="h-5 w-5 accent-primary"
                    />
                    Alle Tiere auswählen
                  </label>
                  {activePets.map((pet) => (
                    <label
                      key={pet.id}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-surface-container"
                    >
                      <input
                        type="checkbox"
                        checked={petIds.includes(pet.id)}
                        onChange={(event) =>
                          setPetIds((selected) =>
                            event.target.checked
                              ? [...selected, pet.id]
                              : selected.filter((id) => id !== pet.id)
                          )
                        }
                        className="h-5 w-5 accent-primary"
                      />
                      {pet.name}
                    </label>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-on-surface-variant">
                Mehrere ausgewählte Tiere werden als ein gemeinsamer Antrag gesendet.
              </p>
            </div>
            <p className="mt-5 text-sm font-bold">Betreuungsart</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BOOKING_TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${type === value ? 'chip-selected' : ''}`}
                  onClick={() => setType(value)}
                >
                  {BOOKING_TYPE_LABELS[value]}
                </button>
              ))}
            </div>
            {type === 'vacation' || type === 'daycare' ? (
              <div className="mt-6 rounded-2xl bg-secondary-container/50 p-4">
                <p className="text-sm font-bold">Wo soll dein Tier betreut werden?</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  So können Urlaubspflege und längere Aufenthalte eindeutig abgestimmt werden.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`chip ${careLocation === 'at_owner_home' ? 'chip-selected' : ''}`}
                    onClick={() => setCareLocation('at_owner_home')}
                  >
                    Bei mir zu Hause (Besuche)
                  </button>
                  <button
                    type="button"
                    className={`chip ${careLocation === 'at_owner_home_live_in' ? 'chip-selected' : ''}`}
                    onClick={() => setCareLocation('at_owner_home_live_in')}
                  >
                    Bei mir zu Hause – Helper zieht vorübergehend ein
                  </button>
                  <button
                    type="button"
                    className={`chip ${careLocation === 'at_helper_home' ? 'chip-selected' : ''}`}
                    onClick={() => setCareLocation('at_helper_home')}
                  >
                    Beim Helper zu Hause
                  </button>
                </div>
              </div>
            ) : null}
          </section>
          <section className="card p-7">
            <h2 className="text-xl font-extrabold">Zeitraum und Treffpunkt</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Beginn
                <input
                  className="input mt-1"
                  type="datetime-local"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>
              <label className="text-sm font-bold">
                Ende
                <input
                  className="input mt-1"
                  type="datetime-local"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-bold">
              Treffpunkt (optional)
              <input
                className="input mt-1"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Adresse oder Treffpunkt"
              />
            </label>
          </section>
          <section className="card p-7">
            <h2 className="text-xl font-extrabold">Vergütung und Hinweise</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`chip ${currency === 'KIEZ_HOURS' ? 'chip-selected' : ''}`}
                onClick={() => setCurrency('KIEZ_HOURS')}
              >
                Nachbarschafts-Stunden
              </button>
              <button
                type="button"
                className={`chip ${currency === 'PER_VISIT' ? 'chip-selected' : ''}`}
                onClick={() => setCurrency('PER_VISIT')}
              >
                Pro Besuch
              </button>
              <button
                type="button"
                className={`chip ${currency === 'EUR' ? 'chip-selected' : ''}`}
                onClick={() => setCurrency('EUR')}
              >
                Euro
              </button>
            </div>
            <label className="mt-4 block text-sm font-bold">
              {currency === 'EUR'
                ? 'Preis in €'
                : currency === 'PER_VISIT'
                  ? 'Preis pro Besuch in €'
                  : 'Stunden'}
              <input
                className="input mt-1"
                type="number"
                min="0"
                step="0.5"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
            <label className="mt-4 block text-sm font-bold">
              Betreuungsnotizen
              <textarea
                className="input mt-1 min-h-28"
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Medikamente, Fütterung, Besonderheiten …"
              />
            </label>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(event) => setUrgent(event.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              Dringender Betreuungsfall
            </label>
          </section>
          <section className="card p-7">
            <h2 className="text-xl font-extrabold">Sicherheit vor der ersten Betreuung</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Vereinbare ein persönliches Probetreffen, teile Kontaktdaten erst im geschützten Chat
              und prüfe deinen Versicherungsschutz.
            </p>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={safety}
                onChange={(event) => setSafety(event.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              Ich habe die Hinweise gelesen.
            </label>
          </section>
          {formError || create.isError ? (
            <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
              {formError ?? create.error?.message}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={create.isPending || pets.isPending || activePets.length === 0}
            onClick={submit}
          >
            {create.isPending ? 'Wird gesendet …' : 'Betreuungsanfrage senden'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={<main className="min-h-screen bg-surface p-10">Formular wird geladen …</main>}
    >
      <NewBookingForm />
    </Suspense>
  );
}
