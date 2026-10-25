'use client';

import {
  AVAILABILITY_BOOKING_TYPES,
  AVAILABILITY_PET_SPECIES,
  findAvailabilityOverlap,
  useCreateAvailability,
  useDeleteAvailability,
  useOwnAvailabilities,
  useUpdateAvailability,
  type Availability,
  type BookingType,
} from '@pfotennetz/supabase';
import {
  AVAILABILITY_WEEKDAYS,
  availabilityWeekdayLabel,
  buildAvailabilityWeek,
  findAvailabilityBlockAt,
  formatAvailabilityDuration,
  formatAvailabilityRange,
  formatAvailabilityTime,
  minutesToTime,
  normalizeAvailabilityRange,
  shiftAvailabilityRange,
  snapAvailabilityMinutes,
} from '@pfotennetz/shared';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const SPECIES: Record<string, string> = {
  dog: 'Hund',
  cat: 'Katze',
  bird: 'Vogel',
  horse: 'Pferd',
  amphibian: 'Amphibie',
  fish: 'Fisch',
  other: 'Andere',
};
const BOOKING_LABELS: Record<BookingType, string> = {
  walk: 'Gassi',
  feeding: 'Füttern',
  vacation: 'Urlaub',
  daycare: 'Tagesbetreuung',
  ride: 'Ausreiten',
};

const DEFAULT_SETTINGS = {
  radius: '5',
  types: ['walk'] as BookingType[],
  species: [...AVAILABILITY_PET_SPECIES] as string[],
};

const smallButton =
  'inline-flex min-h-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest px-3 text-xs font-bold transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50';
const smallDangerButton =
  'inline-flex min-h-9 items-center justify-center rounded-full border border-error bg-surface-container-lowest px-3 text-xs font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50';

interface SlotDraft {
  dayOfWeek: number;
  start: string;
  end: string;
  radius: string;
  types: BookingType[];
  species: string[];
}

interface DraftSettings {
  radius: string;
  types: BookingType[];
  species: string[];
}

interface DragState {
  mode: 'create' | 'move' | 'resize';
  dayOfWeek: number;
  slotId: string | null;
  anchor: number;
  originStart: number;
  originEnd: number;
  previewStart: number;
  previewEnd: number;
  pointerStartX: number;
  moved: boolean;
}

function isBookingType(value: string): value is BookingType {
  return AVAILABILITY_BOOKING_TYPES.includes(value as BookingType);
}

function slotToDraft(slot: Availability): SlotDraft {
  const types = ((slot.booking_types as string[] | null) ?? []).filter(isBookingType);
  const species = (slot.pet_species as string[] | null) ?? [];
  return {
    dayOfWeek: slot.day_of_week,
    start: formatAvailabilityTime(slot.start_time),
    end: formatAvailabilityTime(slot.end_time),
    radius: String(Number(slot.max_distance_km)),
    types: types.length > 0 ? types : ['walk'],
    species: species.length > 0 ? species : [...AVAILABILITY_PET_SPECIES],
  };
}

function overlapMessage(slot: Availability): string {
  return `Überschneidung mit ${availabilityWeekdayLabel(
    slot.day_of_week
  )}, ${formatAvailabilityRange(
    slot.start_time,
    slot.end_time
  )}. Bitte wähle einen freien Zeitraum.`;
}

function WeeklyEditor({
  slots,
  selectedId,
  onCreate,
  onUpdateRange,
  onSelect,
}: {
  slots: Availability[];
  selectedId: string | null;
  onCreate: (dayOfWeek: number, startMinutes: number, endMinutes: number) => void;
  onUpdateRange: (id: string, startMinutes: number, endMinutes: number) => void;
  onSelect: (slot: Availability) => void;
}) {
  const week = buildAvailabilityWeek(slots);
  const span = Math.max(1, week.endMinutes - week.startMinutes);
  const percent = (minutes: number) => ((minutes - week.startMinutes) / span) * 100;
  const [drag, setDrag] = useState<DragState | null>(null);
  const activeCount = slots.filter((slot) => slot.is_active !== false).length;
  const dragConflict =
    drag === null
      ? undefined
      : findAvailabilityOverlap(
          slots,
          {
            dayOfWeek: drag.dayOfWeek,
            startTime: minutesToTime(drag.previewStart),
            endTime: minutesToTime(drag.previewEnd),
          },
          drag.slotId ?? undefined
        );

  const pointerMinutes = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return week.startMinutes;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return week.startMinutes + ratio * span;
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    day: (typeof week.days)[number]
  ) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const y = event.clientY - rect.top;
    const minutes = pointerMinutes(event);
    const hit = findAvailabilityBlockAt(day.blocks, week, { x, y, width: rect.width });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    if (hit !== null) {
      const endX = ((hit.endMinutes - week.startMinutes) / span) * rect.width;
      const mode = x >= endX - 10 ? 'resize' : 'move';
      setDrag({
        mode,
        dayOfWeek: day.dayOfWeek,
        slotId: hit.slot.id,
        anchor: minutes,
        originStart: hit.startMinutes,
        originEnd: hit.endMinutes,
        previewStart: hit.startMinutes,
        previewEnd: hit.endMinutes,
        pointerStartX: event.clientX,
        moved: false,
      });
      return;
    }
    const start = Math.min(24 * 60 - 30, snapAvailabilityMinutes(minutes));
    setDrag({
      mode: 'create',
      dayOfWeek: day.dayOfWeek,
      slotId: null,
      anchor: start,
      originStart: start,
      originEnd: start,
      previewStart: start,
      previewEnd: Math.min(24 * 60, start + 60),
      pointerStartX: event.clientX,
      moved: false,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const minutes = pointerMinutes(event);
    const pointerX = event.clientX;
    setDrag((current) => {
      if (current === null) return current;
      const moved = current.moved || Math.abs(pointerX - current.pointerStartX) > 3;
      if (current.mode === 'create') {
        const range = normalizeAvailabilityRange(current.anchor, minutes);
        return { ...current, ...rangeToPreview(range), moved };
      }
      if (current.mode === 'move') {
        const range = shiftAvailabilityRange(
          current.originStart,
          current.originEnd,
          minutes - current.anchor
        );
        return { ...current, ...rangeToPreview(range), moved };
      }
      const end = Math.min(
        24 * 60,
        Math.max(current.originStart + 30, snapAvailabilityMinutes(minutes))
      );
      return { ...current, previewStart: current.originStart, previewEnd: end, moved };
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const current = drag;
    setDrag(null);
    if (current === null) return;

    const minutes = pointerMinutes(event);
    const moved = current.moved || Math.abs(event.clientX - current.pointerStartX) > 3;

    if (current.mode === 'create') {
      if (!moved) {
        onCreate(current.dayOfWeek, current.anchor, Math.min(24 * 60, current.anchor + 60));
        return;
      }
      const range = normalizeAvailabilityRange(current.anchor, minutes);
      onCreate(current.dayOfWeek, range.startMinutes, range.endMinutes);
      return;
    }

    const slot = slots.find((entry) => entry.id === current.slotId);
    if (slot === undefined) return;
    if (!moved) {
      onSelect(slot);
      return;
    }
    if (current.mode === 'move') {
      const range = shiftAvailabilityRange(
        current.originStart,
        current.originEnd,
        minutes - current.anchor
      );
      onUpdateRange(slot.id, range.startMinutes, range.endMinutes);
      return;
    }
    const end = Math.min(
      24 * 60,
      Math.max(current.originStart + 30, snapAvailabilityMinutes(minutes))
    );
    onUpdateRange(slot.id, current.originStart, end);
  };

  return (
    <div className="mt-5 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-extrabold text-on-surface">Wochenplan</p>
        <p className="text-xs font-semibold text-on-surface-variant">
          {activeCount === 0
            ? 'Keine aktiven Zeitfenster'
            : `${activeCount} aktiv · ${formatAvailabilityDuration(week.totalMinutes)} pro Woche`}
        </p>
      </div>
      <p className="mt-1 text-xs text-on-surface-variant">
        Tippe oder ziehe im Raster, um ein Zeitfenster anzulegen. Blöcke lassen sich verschieben –
        an der rechten Kante auch verlängern.
        {slots.some((slot) => slot.is_active === false) ? ' Graue Zeitfenster sind pausiert.' : ''}
      </p>

      <div className="mt-4">
        {week.days.map((day) => {
          const maxLanes = day.blocks.reduce((max, block) => Math.max(max, block.lanes), 1);
          const trackHeight = Math.max(40, maxLanes * 26 + 12);
          return (
            <div key={day.dayOfWeek} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-xs font-extrabold text-on-surface-variant">
                {day.short}
              </span>
              <div
                role="button"
                tabIndex={0}
                aria-label={`${day.long}: Zeitfenster antippen, ziehen oder mit Enter anlegen`}
                className="relative flex-1 cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary"
                style={{ height: trackHeight }}
                onPointerDown={(event) => handlePointerDown(event, day)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onCreate(day.dayOfWeek, 9 * 60, 10 * 60);
                }}
                title={`${day.long} · tippen oder ziehen`}
              >
                {week.hourTicks.map((tick) => (
                  <span
                    key={tick.minutes}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-px bg-outline-variant"
                    style={{ left: `${percent(tick.minutes)}%` }}
                  />
                ))}
                {day.blocks.length === 0 && drag === null ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center pl-2 text-[10px] font-semibold text-on-surface-variant">
                    frei
                  </span>
                ) : null}
                {day.blocks.map((block) => {
                  const isDragging = drag !== null && drag.slotId === block.slot.id;
                  const invalid = isDragging && dragConflict !== undefined;
                  const startMinutes = isDragging ? drag.previewStart : block.startMinutes;
                  const endMinutes = isDragging ? drag.previewEnd : block.endMinutes;
                  const selected = block.slot.id === selectedId;
                  const left = percent(startMinutes);
                  const width = Math.max(percent(endMinutes) - left, 1);
                  const compact = width < 14;
                  return (
                    <div
                      key={block.slot.id}
                      aria-hidden="true"
                      className={`pointer-events-none absolute overflow-hidden rounded-md px-1 text-left text-[10px] font-bold ${
                        invalid
                          ? 'bg-error-container text-on-error-container'
                          : block.isActive
                            ? 'bg-primary text-on-primary'
                            : 'bg-outline-variant text-on-surface-variant'
                      } ${selected ? 'ring-2 ring-secondary ring-offset-1' : ''} ${
                        isDragging ? 'opacity-80' : ''
                      }`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        top: 4 + block.lane * 26,
                        height: 22,
                      }}
                    >
                      <span className="block truncate">
                        {width < 7 ? (
                          ''
                        ) : compact ? (
                          formatAvailabilityTime(block.slot.start_time).slice(0, 2)
                        ) : (
                          <>
                            <span className="sm:hidden">{minutesToTime(startMinutes)}</span>
                            <span className="hidden sm:inline">
                              {minutesToTime(startMinutes)}–{minutesToTime(endMinutes)}
                            </span>
                          </>
                        )}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-1 right-1 w-0.5 rounded bg-current opacity-70" />
                      ) : null}
                    </div>
                  );
                })}
                {drag !== null && drag.mode === 'create' && drag.dayOfWeek === day.dayOfWeek ? (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute rounded-md border-2 border-dashed px-1 text-[10px] font-bold ${
                      dragConflict === undefined
                        ? 'border-primary bg-primary-fixed text-on-primary-fixed'
                        : 'border-error bg-error-container text-on-error-container'
                    }`}
                    style={{
                      left: `${percent(drag.previewStart)}%`,
                      width: `${Math.max(percent(drag.previewEnd) - percent(drag.previewStart), 1)}%`,
                      top: 4,
                      height: 22,
                    }}
                  >
                    <span className="block truncate">
                      {minutesToTime(drag.previewStart)}–{minutesToTime(drag.previewEnd)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-3">
        <span className="w-8 shrink-0" aria-hidden="true" />
        <div className="relative h-4 flex-1">
          {week.hourTicks.map((tick) => {
            const major =
              tick.minutes === week.startMinutes ||
              tick.minutes === week.endMinutes ||
              tick.minutes % 240 === 0;
            return (
              <span
                key={tick.minutes}
                className={`absolute -translate-x-1/2 text-[10px] font-semibold text-on-surface-variant ${
                  major ? '' : 'hidden sm:block'
                }`}
                style={{ left: `${percent(tick.minutes)}%` }}
              >
                {tick.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function rangeToPreview(range: { startMinutes: number; endMinutes: number }) {
  return { previewStart: range.startMinutes, previewEnd: range.endMinutes };
}

export function AvailabilityManager() {
  const query = useOwnAvailabilities();
  const create = useCreateAvailability();
  const update = useUpdateAvailability();
  const remove = useDeleteAvailability();
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const lastSettings = useRef<DraftSettings>(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [rangeOverrides, setRangeOverrides] = useState<
    Record<string, { start: string; end: string }>
  >({});

  const slots = useMemo(() => {
    const source = query.data ?? [];
    return source.map((slot) => {
      const override = rangeOverrides[slot.id];
      if (override === undefined) return slot;
      return {
        ...slot,
        start_time: `${override.start}:00`,
        end_time: `${override.end}:00`,
      };
    });
  }, [query.data, rangeOverrides]);

  const selectedSlot = slots.find((slot) => slot.id === selectedId) ?? null;

  const toggle = <T,>(items: T[], value: T): T[] =>
    items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

  const clearOverride = (id: string) => {
    setRangeOverrides((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const selectSlot = (slot: Availability) => {
    setSelectedId(slot.id);
    setDraft(slotToDraft(slot));
    setFormError(null);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setDraft(null);
    setFormError(null);
  };

  const rememberSettings = (value: DraftSettings) => {
    lastSettings.current = {
      radius: value.radius,
      types: [...value.types],
      species: [...value.species],
    };
  };

  const createSlot = (dayOfWeek: number, startMinutes: number, endMinutes: number) => {
    const startTime = minutesToTime(startMinutes);
    const endTime = minutesToTime(endMinutes);
    const conflict = findAvailabilityOverlap(slots, { dayOfWeek, startTime, endTime });
    if (conflict !== undefined) {
      setFormError(overlapMessage(conflict));
      return;
    }
    setFormError(null);
    const settings = lastSettings.current;
    create.mutate(
      {
        dayOfWeek,
        startTime,
        endTime,
        maxDistanceKm: Number(settings.radius.replace(',', '.')),
        bookingTypes: settings.types,
        petSpecies: settings.species,
      },
      {
        onSuccess: (slot) => {
          selectSlot(slot);
          inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        },
      }
    );
  };

  const updateRange = (id: string, startMinutes: number, endMinutes: number) => {
    const slot = slots.find((entry) => entry.id === id);
    if (slot === undefined) return;
    const start = minutesToTime(startMinutes);
    const end = minutesToTime(endMinutes);
    const conflict = findAvailabilityOverlap(
      slots,
      { dayOfWeek: slot.day_of_week, startTime: start, endTime: end },
      id
    );
    if (conflict !== undefined) {
      setFormError(overlapMessage(conflict));
      return;
    }
    setFormError(null);
    setRangeOverrides((current) => ({ ...current, [id]: { start, end } }));
    if (id === selectedId) {
      setDraft((current) => (current === null ? current : { ...current, start, end }));
    }
    update.mutate(
      { id, input: { startTime: start, endTime: end } },
      { onError: () => clearOverride(id) }
    );
  };

  const saveDraft = () => {
    if (selectedSlot === null || draft === null) return;
    setFormError(null);
    if (draft.start >= draft.end) {
      setFormError('Das Ende muss nach dem Beginn liegen.');
      return;
    }
    if (draft.types.length === 0) {
      setFormError('Bitte wähle mindestens eine Betreuungsart.');
      return;
    }
    if (draft.species.length === 0) {
      setFormError('Bitte wähle mindestens eine Tierart.');
      return;
    }
    const conflict = findAvailabilityOverlap(
      slots,
      { dayOfWeek: draft.dayOfWeek, startTime: draft.start, endTime: draft.end },
      selectedSlot.id
    );
    if (conflict !== undefined) {
      setFormError(overlapMessage(conflict));
      return;
    }
    rememberSettings(draft);
    setRangeOverrides((current) => ({
      ...current,
      [selectedSlot.id]: { start: draft.start, end: draft.end },
    }));
    update.mutate(
      {
        id: selectedSlot.id,
        input: {
          dayOfWeek: draft.dayOfWeek,
          startTime: draft.start,
          endTime: draft.end,
          maxDistanceKm: Number(draft.radius.replace(',', '.')),
          bookingTypes: draft.types,
          petSpecies: draft.species,
        },
      },
      { onError: () => clearOverride(selectedSlot.id) }
    );
  };

  return (
    <section className="card p-7">
      <h2 className="text-xl font-extrabold text-on-surface">Meine Verfügbarkeiten</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Male deine Zeiten direkt in den Wochenplan – so siehst du sofort, wann du in der
        Helfer:innen-Suche erscheinst.
      </p>

      {query.isPending ? (
        <p className="mt-4 text-sm text-on-surface-variant">Verfügbarkeiten werden geladen …</p>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-error">{query.error.message}</p>
      ) : (
        <>
          <WeeklyEditor
            slots={slots}
            selectedId={selectedId}
            onCreate={createSlot}
            onUpdateRange={updateRange}
            onSelect={selectSlot}
          />

          {formError !== null ? <p className="mt-3 text-sm text-error">{formError}</p> : null}
          {create.isError ? (
            <p className="mt-3 text-sm text-error">{create.error.message}</p>
          ) : null}
          {update.isError ? (
            <p className="mt-3 text-sm text-error">{update.error.message}</p>
          ) : null}
          {remove.isError ? (
            <p className="mt-3 text-sm text-error">{remove.error.message}</p>
          ) : null}

          {slots.length === 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">
              Noch keine Zeitfenster. Tippe in den Wochenplan, um dein erstes Zeitfenster anzulegen.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((slot) => {
                const paused = slot.is_active === false;
                const selected = slot.id === selectedId;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-pressed={selected}
                    className={`chip min-h-9 items-center border px-3 text-xs ${
                      selected
                        ? 'chip-selected'
                        : 'border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container'
                    } ${paused ? 'opacity-70' : ''}`}
                    onClick={() => selectSlot(slot)}
                  >
                    {availabilityWeekdayLabel(slot.day_of_week, 'short')}{' '}
                    {formatAvailabilityRange(slot.start_time, slot.end_time)}
                    {paused ? ' · pausiert' : ''}
                  </button>
                );
              })}
            </div>
          )}

          {selectedSlot !== null && draft !== null ? (
            <div
              ref={inspectorRef}
              className="mt-5 scroll-mt-24 rounded-2xl border border-primary bg-surface-container-low p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">
                    Zeitfenster bearbeiten
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
                    {availabilityWeekdayLabel(draft.dayOfWeek)} · {draft.start}–{draft.end} Uhr ·{' '}
                    {selectedSlot.is_active === false ? 'pausiert' : 'aktiv'}
                  </p>
                </div>
                <button type="button" className={smallButton} onClick={clearSelection}>
                  Schließen
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="text-xs font-bold text-on-surface">
                  Tag
                  <select
                    className="input mt-1"
                    value={draft.dayOfWeek}
                    onChange={(event) =>
                      setDraft((current) =>
                        current === null
                          ? current
                          : { ...current, dayOfWeek: Number(event.target.value) }
                      )
                    }
                  >
                    {AVAILABILITY_WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.long}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-on-surface">
                  Von
                  <input
                    className="input mt-1"
                    type="time"
                    step="1800"
                    value={draft.start}
                    onChange={(event) =>
                      setDraft((current) =>
                        current === null ? current : { ...current, start: event.target.value }
                      )
                    }
                  />
                </label>
                <label className="text-xs font-bold text-on-surface">
                  Bis
                  <input
                    className="input mt-1"
                    type="time"
                    step="1800"
                    value={draft.end}
                    onChange={(event) =>
                      setDraft((current) =>
                        current === null ? current : { ...current, end: event.target.value }
                      )
                    }
                  />
                </label>
                <label className="text-xs font-bold text-on-surface">
                  Radius (km)
                  <input
                    className="input mt-1"
                    type="number"
                    min="1"
                    max="50"
                    value={draft.radius}
                    onChange={(event) =>
                      setDraft((current) =>
                        current === null ? current : { ...current, radius: event.target.value }
                      )
                    }
                  />
                </label>
              </div>

              <fieldset className="mt-3">
                <legend className="text-xs font-bold text-on-surface">Betreuungsarten</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {AVAILABILITY_BOOKING_TYPES.filter(
                    (type) =>
                      (type !== 'ride' || draft.species.includes('horse')) &&
                      (type !== 'walk' || draft.species.includes('dog'))
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`chip min-h-8 items-center border px-2.5 text-xs ${
                        draft.types.includes(type)
                          ? 'chip-selected'
                          : 'border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container'
                      }`}
                      onClick={() =>
                        setDraft((current) =>
                          current === null
                            ? current
                            : { ...current, types: toggle(current.types, type) }
                        )
                      }
                    >
                      {BOOKING_LABELS[type]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-3">
                <legend className="text-xs font-bold text-on-surface">Tierarten</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {AVAILABILITY_PET_SPECIES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip min-h-8 items-center border px-2.5 text-xs ${
                        draft.species.includes(value)
                          ? 'chip-selected'
                          : 'border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container'
                      }`}
                      onClick={() =>
                        setDraft((current) => {
                          if (current === null) return current;
                          const species = toggle(current.species, value);
                          let types = current.types;
                          if (!species.includes('horse')) {
                            types = types.filter((type) => type !== 'ride');
                          }
                          if (!species.includes('dog')) {
                            types = types.filter((type) => type !== 'walk');
                          }
                          return { ...current, species, types };
                        })
                      }
                    >
                      {SPECIES[value]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={update.isPending}
                  onClick={saveDraft}
                >
                  {update.isPending ? 'Wird gespeichert …' : 'Änderungen speichern'}
                </button>
                <button
                  type="button"
                  className={smallButton}
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({
                      id: selectedSlot.id,
                      input: { isActive: selectedSlot.is_active === false },
                    })
                  }
                >
                  {selectedSlot.is_active === false ? 'Aktivieren' : 'Pausieren'}
                </button>
                <button
                  type="button"
                  className={smallDangerButton}
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate(selectedSlot.id, {
                      onSuccess: () => {
                        clearOverride(selectedSlot.id);
                        clearSelection();
                      },
                    });
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-on-surface-variant">
              Tippe auf ein Zeitfenster, um Tag, Uhrzeit, Radius und Betreuungsarten anzupassen.
            </p>
          )}
        </>
      )}
    </section>
  );
}
