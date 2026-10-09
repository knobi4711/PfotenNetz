'use client';

import {
  AVAILABILITY_BOOKING_TYPES,
  AVAILABILITY_PET_SPECIES,
  useCreateAvailability,
  useDeleteAvailability,
  useOwnAvailabilities,
  type BookingType,
} from '@pfotennetz/supabase';
import { useState } from 'react';

const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DAY_VALUES = DAYS.map((_, index) => index);
const SPECIES: Record<string, string> = {
  dog: 'Hund',
  cat: 'Katze',
  rabbit: 'Kleintiere',
  guinea_pig: 'Meerschweinchen',
  bird: 'Vogel',
  other: 'Andere',
};
const BOOKING_LABELS: Record<BookingType, string> = {
  walk: 'Gassi',
  feeding: 'Füttern',
  vacation: 'Urlaub',
  daycare: 'Tagesbetreuung',
};

export function AvailabilityManager() {
  const query = useOwnAvailabilities();
  const create = useCreateAvailability();
  const remove = useDeleteAvailability();
  const [days, setDays] = useState<number[]>([1]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [radius, setRadius] = useState('5');
  const [types, setTypes] = useState<BookingType[]>(['walk']);
  const [species, setSpecies] = useState<string[]>([...AVAILABILITY_PET_SPECIES]);
  const [formError, setFormError] = useState<string | null>(null);

  const toggle = <T,>(items: T[], value: T, setItems: (next: T[]) => void) =>
    setItems(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);

  return (
    <section className="card p-7">
      <h2 className="text-xl font-extrabold">Meine Verfügbarkeiten</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Hinterlegte Zeitfenster bestimmen, wann du in der Helfer:innen-Suche erscheinst.
      </p>
      {query.isError ? <p className="mt-4 text-sm text-error">{query.error.message}</p> : null}
      <div className="mt-5 space-y-3">
        {(query.data ?? []).map((slot) => (
          <div
            key={slot.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low p-4"
          >
            <div>
              <p className="font-bold">
                {DAYS[slot.day_of_week]} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
              </p>
              <p className="text-sm text-on-surface-variant">
                Bis {slot.max_distance_km} km ·{' '}
                {(slot.booking_types as string[])
                  .map((type) => BOOKING_LABELS[type as BookingType] ?? type)
                  .join(', ')}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              disabled={remove.isPending}
              onClick={() => remove.mutate(slot.id)}
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Wochentage
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={`chip ${days.length === DAY_VALUES.length ? 'chip-selected' : ''}`}
              onClick={() => setDays(days.length === DAY_VALUES.length ? [] : DAY_VALUES)}
            >
              Alle Tage
            </button>
            {DAYS.map((label, value) => (
              <button
                key={label}
                type="button"
                className={`chip ${days.includes(value) ? 'chip-selected' : ''}`}
                onClick={() => toggle(days, value, setDays)}
              >
                {label}
              </button>
            ))}
          </div>
        </label>
        <label className="text-sm font-bold">
          Maximaler Radius (km)
          <input
            className="input mt-1"
            type="number"
            min="1"
            max="50"
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Von
          <input
            className="input mt-1"
            type="time"
            step="1800"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Bis
          <input
            className="input mt-1"
            type="time"
            step="1800"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold">Betreuungsarten</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVAILABILITY_BOOKING_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`chip ${types.includes(type) ? 'chip-selected' : ''}`}
              onClick={() => toggle(types, type, setTypes)}
            >
              {BOOKING_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold">Tierarten</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVAILABILITY_PET_SPECIES.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip ${species.includes(value) ? 'chip-selected' : ''}`}
              onClick={() => toggle(species, value, setSpecies)}
            >
              {SPECIES[value]}
            </button>
          ))}
        </div>
      </div>
      {formError ? <p className="mt-4 text-sm text-error">{formError}</p> : null}
      {create.isError ? <p className="mt-4 text-sm text-error">{create.error.message}</p> : null}
      <button
        type="button"
        className="btn-primary mt-5"
        disabled={create.isPending}
        onClick={() => {
          setFormError(null);
          if (days.length === 0) {
            setFormError('Bitte wähle mindestens einen Wochentag.');
            return;
          }
          const input = (dayOfWeek: number) => ({
            dayOfWeek,
            startTime: start,
            endTime: end,
            maxDistanceKm: Number(radius),
            bookingTypes: types,
            petSpecies: species,
          });
          void Promise.all(days.map((dayOfWeek) => create.mutateAsync(input(dayOfWeek)))).catch(
            () => {
              // The mutation exposes the server-side validation error below the form.
            }
          );
        }}
      >
        {create.isPending ? 'Wird gespeichert …' : 'Zeitfenster hinzufügen'}
      </button>
    </section>
  );
}
