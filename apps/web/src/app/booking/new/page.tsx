'use client';

import {
  BOOKING_TYPES,
  DEFAULT_TRACKING_RADIUS_M,
  TRACKING_RADIUS_OPTIONS,
  formatTrackingRadius,
  isBookingCoveredByAvailabilities,
  parseTrackingRadiusKm,
  useBooking,
  useBookingGroup,
  useCreateBooking,
  useHelperDetail,
  useOwnPets,
  useUpdateBookingRequest,
  validateBookingPetCompatibility,
  type BookingCurrency,
  type BookingType,
  type CareLocation,
} from '@pfotennetz/supabase';
import { BOOKING_TYPE_LABELS } from '@pfotennetz/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function NewBookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const helperIdFromParams = params.get('helperId');
  const bookingId = params.get('bookingId');
  const isEditMode = bookingId !== null;
  const booking = useBooking(bookingId ?? undefined);
  const bookingGroup = useBookingGroup(booking.data?.booking_group_id);
  const helperId = booking.data?.helper_id ?? (isEditMode ? null : helperIdFromParams);
  const helper = useHelperDetail(helperId);
  const pets = useOwnPets();
  const create = useCreateBooking();
  const update = useUpdateBookingRequest();
  const initializedBooking = useRef<string | null>(null);
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
  const [trackingRadius, setTrackingRadius] = useState<number>(DEFAULT_TRACKING_RADIUS_M);
  const [customRadius, setCustomRadius] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [safety, setSafety] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const activePets = (pets.data ?? []).filter((pet) => pet.is_active && !pet.is_deceased);

  useEffect(() => {
    const value = booking.data;
    if (!isEditMode || value === undefined || initializedBooking.current === value.id) return;
    setPetIds((bookingGroup.data ?? [value]).map((item) => item.pet_id));
    setType(value.type);
    setCareLocation(value.care_location);
    setStart(toDateTimeLocal(value.start_at));
    setEnd(toDateTimeLocal(value.end_at));
    setCurrency(value.currency);
    setPrice(
      value.currency === 'KIEZ_HOURS'
        ? String(value.price_kiez_hours)
        : (value.price_eur_cents / 100).toFixed(2)
    );
    setAddress(value.meeting_address ?? '');
    setNotes(value.care_notes ?? '');
    setTrackingRadius(value.tracking_radius_m ?? DEFAULT_TRACKING_RADIUS_M);
    setUrgent(value.is_urgent);
    setSafety(true);
    initializedBooking.current = value.id;
  }, [booking.data, bookingGroup.data, isEditMode]);

  const submit = () => {
    setFormError(null);
    if (petIds.length === 0) return setFormError('Bitte wähle mindestens ein Tier aus.');
    const compatibilityError = validateBookingPetCompatibility(
      type,
      activePets.filter((pet) => petIds.includes(pet.id)).map((pet) => pet.species)
    );
    if (compatibilityError !== null) return setFormError(compatibilityError);
    if (!start || !end || new Date(end).getTime() <= new Date(start).getTime())
      return setFormError('Bitte wähle einen gültigen Zeitraum.');
    if (!safety) return setFormError('Bitte bestätige die Sicherheitshinweise.');
    const customTrackingRadius =
      customRadius.trim() === '' ? null : parseTrackingRadiusKm(customRadius);
    if (!isEditMode && customRadius.trim() !== '' && customTrackingRadius === null)
      return setFormError('Bitte gib eine Sicherheitszone zwischen 100 m und 10 km an.');
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
    if (isEditMode && bookingId !== null) {
      update.mutate(
        {
          bookingId,
          type,
          startAt: new Date(start).toISOString(),
          endAt: new Date(end).toISOString(),
          meetingAddress: address.trim() || null,
          currency,
          priceEurCents:
            currency === 'EUR' || currency === 'PER_VISIT' ? Math.round(amount * 100) : 0,
          priceKiezHours: currency === 'KIEZ_HOURS' ? amount : 0,
          isUrgent: urgent,
          careNotes: notes.trim() || null,
          careLocation,
        },
        { onSuccess: () => router.replace(`/booking/${bookingId}`) }
      );
      return;
    }

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
        trackingRadiusM: customTrackingRadius ?? trackingRadius,
      },
      { onSuccess: (booking) => router.replace(`/booking/${booking.id}`) }
    );
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/explore" backLabel="Helfersuche" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Betreuung</p>
        <h1 className="mt-2 text-4xl font-extrabold">
          {isEditMode ? 'Betreuungsanfrage bearbeiten' : 'Neue Betreuung buchen'}
        </h1>
        {isEditMode ? (
          <p className="mt-3 text-on-surface-variant">
            Ändere die Anfrage, solange noch kein Helper zugesagt hat.
          </p>
        ) : helperId && helper.data ? (
          <p className="mt-3 text-on-surface-variant">
            Anfrage an <strong>{helper.data.display_name}</strong>
          </p>
        ) : null}
        {!isEditMode && !helperId ? (
          <p className="mt-3 text-on-surface-variant">
            Ohne ausgewählten Helper wird die Anfrage offen für verifizierte Helper veröffentlicht.
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
                      disabled={isEditMode}
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
                        disabled={isEditMode}
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
              {BOOKING_TYPES.filter(
                (value) =>
                  value !== 'ride' ||
                  (petIds.length > 0 &&
                    activePets
                      .filter((pet) => petIds.includes(pet.id))
                      .every((pet) => pet.species === 'horse'))
              ).map((value) => (
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
            {type === 'walk' &&
            petIds.length > 0 &&
            validateBookingPetCompatibility(
              type,
              activePets.filter((pet) => petIds.includes(pet.id)).map((pet) => pet.species)
            ) !== null ? (
              <p className="mt-3 rounded-xl bg-error-container p-3 text-sm text-on-error-container">
                Gassirunden sind nur für Hunde möglich. Wähle für andere Tiere Fütterung oder
                Betreuung.
              </p>
            ) : null}
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
          {!isEditMode ? (
            <section className="card p-7">
              <h2 className="text-xl font-extrabold">Sicherheitszone</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Beim Live-Tracking meldet die App der Helferin oder dem Helfer, wenn sie oder er
                sich weiter als diese Entfernung vom Startpunkt entfernt.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {TRACKING_RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`chip ${
                      customRadius.trim() === '' && trackingRadius === option ? 'chip-selected' : ''
                    }`}
                    onClick={() => {
                      setTrackingRadius(option);
                      setCustomRadius('');
                    }}
                  >
                    {formatTrackingRadius(option)}
                  </button>
                ))}
              </div>
              <label className="mt-5 block text-sm font-bold">
                Eigene Weite (km)
                <input
                  className="input mt-1"
                  inputMode="decimal"
                  maxLength={5}
                  placeholder="z. B. 3,5"
                  value={customRadius}
                  onChange={(event) => setCustomRadius(event.target.value)}
                />
              </label>
              <p className="mt-2 text-sm text-on-surface-variant">
                {customRadius.trim() === ''
                  ? `Ausgewählt: ${formatTrackingRadius(trackingRadius)} (100 m bis 10 km möglich).`
                  : parseTrackingRadiusKm(customRadius) !== null
                    ? `Sicherheitszone: ${formatTrackingRadius(
                        parseTrackingRadiusKm(customRadius) ?? trackingRadius
                      )}.`
                    : 'Bitte einen Wert zwischen 0,1 und 10 km eingeben.'}
              </p>
            </section>
          ) : null}
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
                disabled={isEditMode}
                onChange={(event) => setSafety(event.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              Ich habe die Hinweise gelesen.
            </label>
          </section>
          {formError || create.isError || update.isError ? (
            <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
              {formError ?? update.error?.message ?? create.error?.message}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={
              create.isPending ||
              update.isPending ||
              pets.isPending ||
              (!isEditMode && activePets.length === 0)
            }
            onClick={submit}
          >
            {create.isPending || update.isPending
              ? 'Wird gespeichert …'
              : isEditMode
                ? 'Änderungen speichern'
                : 'Betreuungsanfrage senden'}
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
