import { useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AVAILABILITY_BOOKING_TYPES,
  AVAILABILITY_PET_SPECIES,
  findAvailabilityOverlap,
  useCreateAvailability,
  useDeleteAvailability,
  useOwnAvailabilities,
  useSaveAvailabilityForDays,
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
  formatAvailabilityDays,
  formatAvailabilityRange,
  formatAvailabilityTime,
  isAvailabilityCreateDrag,
  minutesToTime,
  normalizeAvailabilityRange,
  shiftAvailabilityRange,
  snapAvailabilityMinutes,
  type AvailabilityDay,
  type AvailabilityWeek,
} from '@pfotennetz/shared';
import { clockToPickerDate, pickerDateToClock } from '../lib/availability-time';
import { bookingTypeLabels } from '../lib/booking';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from './ui';

const DEFAULT_SETTINGS = {
  radius: '5',
  types: ['walk'] as BookingType[],
  species: [...AVAILABILITY_PET_SPECIES] as string[],
};

const PET_SPECIES_LABELS: Record<string, string> = {
  dog: 'Hund',
  cat: 'Katze',
  bird: 'Vogel',
  horse: 'Pferd',
  amphibian: 'Amphibie',
  fish: 'Fisch',
  other: 'Andere',
};

interface SlotDraft {
  dayOfWeek: number;
  /** Extra weekdays that receive the same range and settings when saving. */
  additionalDays: number[];
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

interface TrackPreview {
  slotId: string | null;
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
}

interface TrackGesture {
  mode: 'create' | 'move' | 'resize';
  slot: Availability | null;
  anchorMinutes: number;
  originStart: number;
  originEnd: number;
  pointerStartX: number;
  moved: boolean;
  longPressed: boolean;
}

function isBookingType(value: string): value is BookingType {
  return AVAILABILITY_BOOKING_TYPES.includes(value as BookingType);
}

function slotToDraft(slot: Availability): SlotDraft {
  const types = ((slot.booking_types as string[] | null) ?? []).filter(isBookingType);
  const species = (slot.pet_species as string[] | null) ?? [];
  return {
    dayOfWeek: slot.day_of_week,
    additionalDays: [],
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

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const c = usePalette();
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android shows a dialog that must be dismissed after any interaction;
    // iOS renders the spinner inline and closes via the "Fertig" button.
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || selected === undefined) return;
    onChange(pickerDateToClock(selected));
  };

  return (
    <View style={styles.dropdownContainer}>
      <Text style={[styles.label, { color: c.onSurface }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} auswählen, aktuell ${value} Uhr`}
        accessibilityState={{ expanded: open }}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={[
          styles.dropdownButton,
          { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
        ]}
      >
        <Text style={[styles.dropdownValue, { color: c.onSurface }]}>{value} Uhr</Text>
        <MaterialCommunityIcons name="clock-outline" size={16} color={c.onSurfaceVariant} />
      </Pressable>
      {open ? (
        <>
          <DateTimePicker
            value={clockToPickerDate(value)}
            mode="time"
            is24Hour
            minuteInterval={5}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="de-DE"
            onChange={handleChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={[styles.dropdownDone, { backgroundColor: c.surfaceContainerHigh }]}
            >
              <Text style={[styles.miniText, { color: c.onSurface }]}>Fertig</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function DayTrack({
  day,
  week,
  selectedId,
  onCreate,
  onUpdateRange,
  onSelect,
  onOpenActions,
}: {
  day: AvailabilityDay<Availability>;
  week: AvailabilityWeek<Availability>;
  selectedId: string | null;
  onCreate: (dayOfWeek: number, startMinutes: number, endMinutes: number) => void;
  onUpdateRange: (id: string, startMinutes: number, endMinutes: number) => void;
  onSelect: (slot: Availability) => void;
  onOpenActions: (slot: Availability) => void;
}) {
  const c = usePalette();
  const [preview, setPreview] = useState<TrackPreview | null>(null);
  const gesture = useRef<TrackGesture | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackWidth = useRef(0);
  const current = useRef({
    day,
    week,
    selectedId,
    onCreate,
    onUpdateRange,
    onSelect,
    onOpenActions,
  });
  current.current = { day, week, selectedId, onCreate, onUpdateRange, onSelect, onOpenActions };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: (_event, gestureState) =>
        Math.abs(gestureState.dy) > 8 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5,
      onPanResponderGrant: (event) => {
        const { day: currentDay, week: currentWeek } = current.current;
        const width = trackWidth.current;
        if (width <= 0) return;
        cancelLongPress();
        const x = event.nativeEvent.locationX;
        const y = event.nativeEvent.locationY;
        const span = Math.max(1, currentWeek.endMinutes - currentWeek.startMinutes);
        const ratio = Math.min(1, Math.max(0, x / width));
        const minutes = currentWeek.startMinutes + ratio * span;
        const hit = findAvailabilityBlockAt(currentDay.blocks, currentWeek, { x, y, width });

        if (hit !== null) {
          const endX = ((hit.endMinutes - currentWeek.startMinutes) / span) * width;
          const mode = x >= endX - 14 ? 'resize' : 'move';
          gesture.current = {
            mode,
            slot: hit.slot,
            anchorMinutes: minutes,
            originStart: hit.startMinutes,
            originEnd: hit.endMinutes,
            pointerStartX: x,
            moved: false,
            longPressed: false,
          };
          longPressTimer.current = setTimeout(() => {
            longPressTimer.current = null;
            const active = gesture.current;
            if (active === null || active.moved) return;
            active.longPressed = true;
            setPreview(null);
            current.current.onOpenActions(hit.slot);
          }, 480);
          setPreview({
            slotId: hit.slot.id,
            startMinutes: hit.startMinutes,
            endMinutes: hit.endMinutes,
            isActive: hit.isActive,
          });
          return;
        }

        const start = Math.min(24 * 60 - 30, snapAvailabilityMinutes(minutes));
        gesture.current = {
          mode: 'create',
          slot: null,
          anchorMinutes: start,
          originStart: start,
          originEnd: start,
          pointerStartX: x,
          moved: false,
          longPressed: false,
        };
        // No preview yet: accidental taps must not look like they created a slot.
        // The ghost block appears once the finger really drags horizontally.
      },
      onPanResponderMove: (_event, gestureState) => {
        const active = gesture.current;
        if (active === null) return;
        const horizontal = Math.abs(gestureState.dx);
        if (horizontal > 6 || Math.abs(gestureState.dy) > 6) {
          cancelLongPress();
        }
        // Creating a slot needs a deliberate horizontal drag, so scrolling or
        // brushing over the grid does not add time windows.
        if (active.mode === 'create' && !active.moved) {
          if (!isAvailabilityCreateDrag(gestureState.dx, gestureState.dy)) return;
          active.moved = true;
        }
        const { week: currentWeek } = current.current;
        const width = trackWidth.current;
        if (width <= 0) return;
        const span = Math.max(1, currentWeek.endMinutes - currentWeek.startMinutes);
        const x = active.pointerStartX + gestureState.dx;
        const ratio = Math.min(1, Math.max(0, x / width));
        const minutes = currentWeek.startMinutes + ratio * span;
        let startMinutes = active.originStart;
        let endMinutes = active.originEnd;
        if (active.mode === 'create') {
          const range = normalizeAvailabilityRange(active.anchorMinutes, minutes);
          startMinutes = range.startMinutes;
          endMinutes = range.endMinutes;
        } else if (active.mode === 'move') {
          const range = shiftAvailabilityRange(
            active.originStart,
            active.originEnd,
            minutes - active.anchorMinutes
          );
          startMinutes = range.startMinutes;
          endMinutes = range.endMinutes;
        } else {
          startMinutes = active.originStart;
          endMinutes = Math.min(
            24 * 60,
            Math.max(active.originStart + 30, snapAvailabilityMinutes(minutes))
          );
        }
        const moved = active.moved || Math.abs(gestureState.dx) > 4;
        active.moved = moved;
        setPreview({
          slotId: active.slot?.id ?? null,
          startMinutes,
          endMinutes,
          isActive: active.slot === null ? true : active.slot.is_active !== false,
        });
      },
      onPanResponderRelease: (_event, gestureState) => {
        cancelLongPress();
        const active = gesture.current;
        gesture.current = null;
        setPreview(null);
        if (active === null) return;
        if (active.longPressed) return;
        const width = trackWidth.current;
        if (width <= 0) return;
        const { day: currentDay, week: currentWeek } = current.current;
        const span = Math.max(1, currentWeek.endMinutes - currentWeek.startMinutes);
        const x = active.pointerStartX + gestureState.dx;
        const ratio = Math.min(1, Math.max(0, x / width));
        const minutes = currentWeek.startMinutes + ratio * span;
        const moved = active.moved || Math.abs(gestureState.dx) > 4;

        if (active.mode === 'create') {
          if (!active.moved) return;
          const range = normalizeAvailabilityRange(active.anchorMinutes, minutes);
          current.current.onCreate(currentDay.dayOfWeek, range.startMinutes, range.endMinutes);
          return;
        }

        const slot = active.slot;
        if (slot === null) return;
        if (!moved) {
          current.current.onSelect(slot);
          return;
        }
        if (active.mode === 'move') {
          const range = shiftAvailabilityRange(
            active.originStart,
            active.originEnd,
            minutes - active.anchorMinutes
          );
          current.current.onUpdateRange(slot.id, range.startMinutes, range.endMinutes);
          return;
        }
        const end = Math.min(
          24 * 60,
          Math.max(active.originStart + 30, snapAvailabilityMinutes(minutes))
        );
        current.current.onUpdateRange(slot.id, active.originStart, end);
      },
      onPanResponderTerminate: () => {
        cancelLongPress();
        gesture.current = null;
        setPreview(null);
      },
    })
  ).current;

  const span = Math.max(1, week.endMinutes - week.startMinutes);
  const percent = (minutes: number) => ((minutes - week.startMinutes) / span) * 100;
  const previewConflict =
    preview === null
      ? undefined
      : findAvailabilityOverlap(
          day.blocks.map((block) => block.slot),
          {
            dayOfWeek: day.dayOfWeek,
            startTime: minutesToTime(preview.startMinutes),
            endTime: minutesToTime(preview.endMinutes),
          },
          preview.slotId ?? undefined
        );
  const maxLanes = day.blocks.reduce((max, block) => Math.max(max, block.lanes), 1);
  const trackHeight = Math.max(36, maxLanes * 26 + 12);

  return (
    <View style={styles.graphRow}>
      <Text style={[styles.graphDay, { color: c.onSurfaceVariant }]}>{day.short}</Text>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${day.long}: Zeitfenster wählen oder per Ziehen anlegen`}
        accessibilityHint="Waagerechtes Ziehen legt ein Zeitfenster an. Tippen wählt ein Zeitfenster aus. Langes Drücken auf ein Zeitfenster öffnet Aktionen wie Löschen. Mit der Bedienungshilfen-Aktion wird ein Zeitfenster von 9 bis 10 Uhr angelegt."
        onAccessibilityTap={() => current.current.onCreate(day.dayOfWeek, 9 * 60, 10 * 60)}
        onLayout={(event) => {
          trackWidth.current = event.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
        style={[
          styles.graphTrack,
          {
            height: trackHeight,
            backgroundColor: c.surfaceContainerLowest,
            borderColor: c.outlineVariant,
          },
        ]}
      >
        {week.hourTicks.map((tick) => (
          <View
            key={tick.minutes}
            pointerEvents="none"
            style={[
              styles.graphHourLine,
              { left: `${percent(tick.minutes)}%`, backgroundColor: c.outlineVariant },
            ]}
          />
        ))}
        {day.blocks.length === 0 && preview === null ? (
          <View pointerEvents="none" style={styles.graphFreeWrap}>
            <Text style={[styles.graphFree, { color: c.onSurfaceVariant }]}>frei</Text>
          </View>
        ) : null}
        {day.blocks.map((block) => {
          const visual = preview !== null && preview.slotId === block.slot.id ? preview : null;
          const invalid = visual !== null && previewConflict !== undefined;
          const startMinutes = visual?.startMinutes ?? block.startMinutes;
          const endMinutes = visual?.endMinutes ?? block.endMinutes;
          const isActive = visual?.isActive ?? block.isActive;
          const left = percent(startMinutes);
          const width = Math.max(percent(endMinutes) - left, 1.5);
          const compact = width < 24;
          const selected = block.slot.id === selectedId;
          return (
            <View
              key={block.slot.id}
              pointerEvents="none"
              style={[
                styles.graphBlock,
                {
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 4 + block.lane * 26,
                  backgroundColor: invalid
                    ? c.errorContainer
                    : isActive
                      ? c.primary
                      : c.surfaceContainerHigh,
                  borderWidth: invalid || selected ? 2 : 0,
                  borderColor: invalid ? c.error : c.onSurface,
                  opacity: visual === null ? 1 : 0.85,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.graphBlockText,
                  {
                    color: invalid
                      ? c.onErrorContainer
                      : isActive
                        ? c.onPrimary
                        : c.onSurfaceVariant,
                  },
                ]}
              >
                {width < 7
                  ? ''
                  : compact
                    ? minutesToTime(startMinutes).slice(0, 2)
                    : `${minutesToTime(startMinutes)}–${minutesToTime(endMinutes)}`}
              </Text>
              {selected && !invalid ? (
                <View style={[styles.graphResizeHint, { backgroundColor: c.onPrimary }]} />
              ) : null}
            </View>
          );
        })}
        {preview !== null && preview.slotId === null ? (
          <View
            pointerEvents="none"
            style={[
              styles.graphCreatePreview,
              {
                left: `${percent(preview.startMinutes)}%`,
                width: `${Math.max(
                  percent(preview.endMinutes) - percent(preview.startMinutes),
                  1.5
                )}%`,
                borderColor: previewConflict === undefined ? c.primary : c.error,
                backgroundColor: previewConflict === undefined ? c.primaryFixed : c.errorContainer,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.graphBlockText,
                {
                  color: previewConflict === undefined ? c.onPrimaryFixed : c.onErrorContainer,
                },
              ]}
            >
              {minutesToTime(preview.startMinutes)}–{minutesToTime(preview.endMinutes)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function WeeklyEditor({
  slots,
  selectedId,
  onCreate,
  onUpdateRange,
  onSelect,
  onOpenActions,
}: {
  slots: Availability[];
  selectedId: string | null;
  onCreate: (dayOfWeek: number, startMinutes: number, endMinutes: number) => void;
  onUpdateRange: (id: string, startMinutes: number, endMinutes: number) => void;
  onSelect: (slot: Availability) => void;
  onOpenActions: (slot: Availability) => void;
}) {
  const c = usePalette();
  const week = buildAvailabilityWeek(slots);
  const span = Math.max(1, week.endMinutes - week.startMinutes);
  const percent = (minutes: number) => ((minutes - week.startMinutes) / span) * 100;
  const activeCount = slots.filter((slot) => slot.is_active !== false).length;
  const majorTicks = week.hourTicks.filter(
    (tick) =>
      tick.minutes === week.startMinutes ||
      tick.minutes === week.endMinutes ||
      tick.minutes % 240 === 0
  );
  // Directly before the right edge the labels would overlap on narrow phones,
  // so the penultimate one is dropped instead of squeezing both together.
  const axisTicks =
    majorTicks.length > 1 &&
    majorTicks[majorTicks.length - 1]!.minutes - majorTicks[majorTicks.length - 2]!.minutes < 180
      ? majorTicks.filter((_, index) => index !== majorTicks.length - 2)
      : majorTicks;

  return (
    <View style={[styles.graph, { backgroundColor: c.surfaceContainerLow }]}>
      <View style={styles.graphHeader}>
        <Text style={[styles.graphTitle, { color: c.onSurface }]}>Wochenplan</Text>
        <Text style={[styles.graphStat, { color: c.onSurfaceVariant }]}>
          {activeCount === 0
            ? 'keine aktiven Zeitfenster'
            : `${activeCount} aktiv · ${formatAvailabilityDuration(week.totalMinutes)}/Woche`}
        </Text>
      </View>
      <Text style={[styles.graphHint, { color: c.onSurfaceVariant }]}>
        Ziehe waagerecht über einen Tag, um ein Zeitfenster anzulegen. Tippen wählt ein Fenster aus,
        langes Drücken öffnet Löschen und Pausieren. Im Editor lässt sich dasselbe Zeitfenster für
        mehrere Tage speichern.
        {slots.some((slot) => slot.is_active === false) ? ' Graue Zeitfenster sind pausiert.' : ''}
      </Text>

      <View style={styles.graphBody}>
        {week.days.map((day) => (
          <DayTrack
            key={day.dayOfWeek}
            day={day}
            week={week}
            selectedId={selectedId}
            onCreate={onCreate}
            onUpdateRange={onUpdateRange}
            onSelect={onSelect}
            onOpenActions={onOpenActions}
          />
        ))}
      </View>

      <View style={styles.graphAxis}>
        <View style={styles.graphAxisSpacer} />
        <View style={styles.graphAxisTrack}>
          {axisTicks.map((tick, index) => {
            const last = index === axisTicks.length - 1;
            return (
              <Text
                key={tick.minutes}
                style={[
                  styles.graphAxisLabel,
                  {
                    color: c.onSurfaceVariant,
                    left: `${percent(tick.minutes)}%`,
                    transform: [{ translateX: last ? -24 : -8 }],
                  },
                ]}
              >
                {tick.label}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function AvailabilityManager() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const listQuery = useOwnAvailabilities();
  const create = useCreateAvailability();
  const update = useUpdateAvailability();
  const saveDays = useSaveAvailabilityForDays();
  const remove = useDeleteAvailability();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionSlotId, setActionSlotId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [rangeOverrides, setRangeOverrides] = useState<
    Record<string, { start: string; end: string }>
  >({});
  const lastSettings = useRef<DraftSettings>(DEFAULT_SETTINGS);

  const slots = (listQuery.data ?? []).map((slot) => {
    const override = rangeOverrides[slot.id];
    if (override === undefined) return slot;
    return {
      ...slot,
      start_time: `${override.start}:00`,
      end_time: `${override.end}:00`,
    };
  });
  const selectedSlot = slots.find((slot) => slot.id === selectedId) ?? null;
  const actionSlot = slots.find((slot) => slot.id === actionSlotId) ?? null;
  const busy = create.isPending || update.isPending || saveDays.isPending || remove.isPending;

  const openActions = (slot: Availability) => {
    setActionSlotId(slot.id);
  };

  const closeActions = () => {
    setActionSlotId(null);
  };

  const deleteSlot = (slot: Availability) => {
    setActionSlotId(null);
    if (slot.id === selectedId) clearSelection();
    remove.mutate(slot.id, {
      onSuccess: () => {
        clearOverride(slot.id);
      },
    });
  };

  const toggleActive = (slot: Availability) => {
    update.mutate({
      id: slot.id,
      input: { isActive: slot.is_active === false },
    });
    setActionSlotId(null);
  };

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
      { onSuccess: (slot) => selectSlot(slot) }
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

  const saveDraft = async () => {
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
    rememberSettings(draft);
    setRangeOverrides((current) => ({
      ...current,
      [selectedSlot.id]: { start: draft.start, end: draft.end },
    }));
    try {
      await saveDays.mutateAsync({
        id: selectedSlot.id,
        input: {
          dayOfWeek: draft.dayOfWeek,
          additionalDays: draft.additionalDays,
          startTime: draft.start,
          endTime: draft.end,
          maxDistanceKm: Number(draft.radius.replace(',', '.')),
          bookingTypes: draft.types,
          petSpecies: draft.species,
        },
      });
      setDraft((current) => (current === null ? current : { ...current, additionalDays: [] }));
    } catch (error) {
      clearOverride(selectedSlot.id);
      setFormError(
        error instanceof Error ? error.message : 'Das Zeitfenster konnte nicht gespeichert werden.'
      );
    }
  };

  return (
    <>
      <Card>
        <SectionTitle>Meine Verfügbarkeiten</SectionTitle>
        <Text style={[styles.description, { color: c.onSurfaceVariant }]}>
          Male deine Zeiten direkt in den Wochenplan – so siehst du sofort, wann du gefunden wirst.
          Im Editor übernimmst du ein Zeitfenster mit einer Speicherung auf weitere Tage.
        </Text>
        {listQuery.isPending ? (
          <LoadingView label="Verfügbarkeiten werden geladen …" />
        ) : listQuery.isError ? (
          <ErrorBox
            message={`Verfügbarkeiten konnten nicht geladen werden: ${listQuery.error.message}`}
            onRetry={() => {
              void listQuery.refetch();
            }}
          />
        ) : (
          <>
            <WeeklyEditor
              slots={slots}
              selectedId={selectedId}
              onCreate={createSlot}
              onUpdateRange={updateRange}
              onSelect={selectSlot}
              onOpenActions={openActions}
            />

            {slots.length === 0 ? (
              <EmptyText>
                Noch keine Zeitfenster. Ziehe waagerecht über einen Tag, um dein erstes Zeitfenster
                anzulegen.
              </EmptyText>
            ) : (
              <View style={styles.chooserRow}>
                {slots.map((slot) => {
                  const selected = slot.id === selectedId;
                  const paused = slot.is_active === false;
                  return (
                    <Pressable
                      key={slot.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityHint="Lange drücken für Löschen und Pausieren"
                      delayLongPress={400}
                      onLongPress={() => openActions(slot)}
                      onPress={() => selectSlot(slot)}
                      style={[
                        styles.chooserChip,
                        {
                          backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                          opacity: paused ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chooserChipText,
                          { color: selected ? c.onPrimary : c.onSurface },
                        ]}
                      >
                        {availabilityWeekdayLabel(slot.day_of_week, 'short')}{' '}
                        {formatAvailabilityRange(slot.start_time, slot.end_time)}
                        {paused ? ' · pausiert' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {formError ? <ErrorBox message={formError} /> : null}
            {create.isError ? (
              <ErrorBox message={`Speichern fehlgeschlagen: ${create.error.message}`} />
            ) : null}
            {update.isError ? (
              <ErrorBox message={`Änderung fehlgeschlagen: ${update.error.message}`} />
            ) : null}
            {remove.isError ? (
              <ErrorBox message={`Löschen fehlgeschlagen: ${remove.error.message}`} />
            ) : null}

            <Text style={[styles.selectionHint, { color: c.onSurfaceVariant }]}>
              Tippe auf ein Zeitfenster, um es zu bearbeiten. Lange drücken öffnet Aktionen zum
              Löschen oder Pausieren.
            </Text>
          </>
        )}
      </Card>

      <Modal
        visible={selectedSlot !== null && draft !== null}
        transparent
        animationType="slide"
        onRequestClose={clearSelection}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bearbeitung schließen"
            onPress={clearSelection}
            style={styles.sheetBackdrop}
          />
          {selectedSlot !== null && draft !== null ? (
            <View
              style={[
                styles.sheetPanel,
                { backgroundColor: c.surface, paddingBottom: insets.bottom },
              ]}
            >
              <ScrollView
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.sheetScroll}
              >
                <View style={styles.inspectorHeader}>
                  <View style={styles.inspectorHeading}>
                    <Text style={[styles.inspectorTitle, { color: c.onSurface }]}>
                      Zeitfenster bearbeiten
                    </Text>
                    <Text style={[styles.inspectorSubtitle, { color: c.onSurfaceVariant }]}>
                      {formatAvailabilityDays([draft.dayOfWeek, ...draft.additionalDays])} ·{' '}
                      {draft.start}–{draft.end} Uhr ·{' '}
                      {selectedSlot.is_active === false ? 'pausiert' : 'aktiv'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Bearbeitung schließen"
                    onPress={clearSelection}
                    style={[styles.miniButton, { backgroundColor: c.surfaceContainerHigh }]}
                  >
                    <Text style={[styles.miniText, { color: c.onSurface }]}>Schließen</Text>
                  </Pressable>
                </View>

                <View style={styles.inspectorActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => toggleActive(selectedSlot)}
                    style={[styles.miniButton, { backgroundColor: c.surfaceContainerHigh }]}
                  >
                    <Text style={[styles.miniText, { color: c.onSurface }]}>
                      {selectedSlot.is_active === false ? 'Aktivieren' : 'Pausieren'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => deleteSlot(selectedSlot)}
                    style={[styles.miniButton, { backgroundColor: c.errorContainer }]}
                  >
                    <Text style={[styles.miniText, { color: c.onErrorContainer }]}>Löschen</Text>
                  </Pressable>
                </View>

                <Text style={[styles.label, { color: c.onSurface }]}>Tag</Text>
                <View style={styles.chipRow}>
                  {AVAILABILITY_WEEKDAYS.map((day) => {
                    const selected = draft.dayOfWeek === day.value;
                    return (
                      <Pressable
                        key={day.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() =>
                          setDraft((current) =>
                            current === null
                              ? current
                              : {
                                  ...current,
                                  dayOfWeek: day.value,
                                  additionalDays: current.additionalDays.filter(
                                    (value) => value !== day.value
                                  ),
                                }
                          )
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: selected ? c.primary : c.surfaceContainerHigh },
                        ]}
                      >
                        <Text
                          style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}
                        >
                          {day.short}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: c.onSurface }]}>Auch an diesen Tagen</Text>
                <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
                  Mehrfachauswahl: Das Zeitfenster wird mit denselben Einstellungen für alle
                  markierten Tage gespeichert.
                </Text>
                <View style={styles.chipRow}>
                  {AVAILABILITY_WEEKDAYS.filter((day) => day.value !== draft.dayOfWeek).map(
                    (day) => {
                      const selected = draft.additionalDays.includes(day.value);
                      return (
                        <Pressable
                          key={day.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${day.long} als zusätzlichen Tag ${selected ? 'entfernen' : 'hinzufügen'}`}
                          onPress={() =>
                            setDraft((current) =>
                              current === null
                                ? current
                                : {
                                    ...current,
                                    additionalDays: toggle(current.additionalDays, day.value),
                                  }
                            )
                          }
                          style={[
                            styles.chip,
                            { backgroundColor: selected ? c.secondary : c.surfaceContainerHigh },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: selected ? c.onSecondary : c.onSurface },
                            ]}
                          >
                            {day.short}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>

                <View style={styles.twoColumns}>
                  <View style={styles.column}>
                    <TimeField
                      label="Von"
                      value={draft.start}
                      disabled={busy}
                      onChange={(start) =>
                        setDraft((current) => (current === null ? current : { ...current, start }))
                      }
                    />
                  </View>
                  <View style={styles.column}>
                    <TimeField
                      label="Bis"
                      value={draft.end}
                      disabled={busy}
                      onChange={(end) =>
                        setDraft((current) => (current === null ? current : { ...current, end }))
                      }
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: c.onSurface }]}>Maximalradius (km)</Text>
                <TextInput
                  editable={!busy}
                  keyboardType="decimal-pad"
                  onChangeText={(radius) =>
                    setDraft((current) => (current === null ? current : { ...current, radius }))
                  }
                  placeholder="5"
                  placeholderTextColor={c.outline}
                  style={[
                    styles.input,
                    {
                      backgroundColor: c.surfaceContainerLow,
                      borderColor: c.outlineVariant,
                      color: c.onSurface,
                    },
                  ]}
                  value={draft.radius}
                />

                <Text style={[styles.label, { color: c.onSurface }]}>Betreuungsarten</Text>
                <View style={styles.chipRow}>
                  {AVAILABILITY_BOOKING_TYPES.filter(
                    (type) =>
                      (type !== 'ride' || draft.species.includes('horse')) &&
                      (type !== 'walk' || draft.species.includes('dog'))
                  ).map((type) => {
                    const selected = draft.types.includes(type);
                    return (
                      <Pressable
                        key={type}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() =>
                          setDraft((current) =>
                            current === null
                              ? current
                              : { ...current, types: toggle(current.types, type) }
                          )
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: selected ? c.primary : c.surfaceContainerHigh },
                        ]}
                      >
                        <Text
                          style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}
                        >
                          {bookingTypeLabels[type]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: c.onSurface }]}>Tierarten</Text>
                <View style={styles.chipRow}>
                  {AVAILABILITY_PET_SPECIES.map((species) => {
                    const selected = draft.species.includes(species);
                    return (
                      <Pressable
                        key={species}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() =>
                          setDraft((current) => {
                            if (current === null) return current;
                            const nextSpecies = toggle(current.species, species);
                            let types = current.types;
                            if (!nextSpecies.includes('horse')) {
                              types = types.filter((type) => type !== 'ride');
                            }
                            if (!nextSpecies.includes('dog')) {
                              types = types.filter((type) => type !== 'walk');
                            }
                            return { ...current, species: nextSpecies, types };
                          })
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: selected ? c.secondary : c.surfaceContainerHigh },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: selected ? c.onSecondary : c.onSurface },
                          ]}
                        >
                          {PET_SPECIES_LABELS[species]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <ActionButton
                  title={
                    draft.additionalDays.length > 0
                      ? `Für ${draft.additionalDays.length + 1} Tage speichern`
                      : 'Änderungen speichern'
                  }
                  pending={saveDays.isPending}
                  onPress={() => {
                    void saveDraft();
                  }}
                />
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={actionSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={closeActions}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aktionsmenü schließen"
            onPress={closeActions}
            style={styles.sheetBackdrop}
          />
          {actionSlot !== null ? (
            <View
              style={[
                styles.actionPanel,
                {
                  backgroundColor: c.surfaceContainerLow,
                  borderColor: c.outlineVariant,
                  paddingBottom: 16 + insets.bottom,
                },
              ]}
            >
              <Text style={[styles.actionTitle, { color: c.onSurface }]}>
                {availabilityWeekdayLabel(actionSlot.day_of_week, 'short')}{' '}
                {formatAvailabilityRange(actionSlot.start_time, actionSlot.end_time)}
              </Text>
              <Text style={[styles.actionSubtitle, { color: c.onSurfaceVariant }]}>
                {actionSlot.is_active === false ? 'Pausiert' : 'Aktiv'} · Zeitfenster-Aktionen
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActionSlotId(null);
                  selectSlot(actionSlot);
                }}
                style={[styles.actionButton, { backgroundColor: c.primary }]}
              >
                <Text style={[styles.actionButtonText, { color: c.onPrimary }]}>Bearbeiten</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => toggleActive(actionSlot)}
                style={[styles.actionButton, { backgroundColor: c.surfaceContainerHigh }]}
              >
                <Text style={[styles.actionButtonText, { color: c.onSurface }]}>
                  {actionSlot.is_active === false ? 'Aktivieren' : 'Pausieren'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => deleteSlot(actionSlot)}
                style={[styles.actionButton, { backgroundColor: c.errorContainer }]}
              >
                <Text style={[styles.actionButtonText, { color: c.onErrorContainer }]}>
                  Löschen
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={closeActions}
                style={styles.actionCancel}
              >
                <Text style={[styles.miniText, { color: c.onSurfaceVariant }]}>Abbrechen</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  description: {
    fontFamily: appFonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 12,
  },
  label: {
    fontFamily: appFonts.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  hint: {
    fontFamily: appFonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
    marginBottom: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: appFonts.regular,
    fontSize: 15,
  },
  dropdownContainer: { flex: 1, position: 'relative', zIndex: 2 },
  dropdownButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: { fontFamily: appFonts.regular, fontSize: 15 },
  dropdownDone: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  graph: { borderRadius: 18, padding: 14, marginTop: 4, marginBottom: 14 },
  graphHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 4,
  },
  graphTitle: { fontFamily: appFonts.extrabold, fontSize: 14, lineHeight: 20 },
  graphStat: { fontFamily: appFonts.bold, fontSize: 10, lineHeight: 15 },
  graphHint: { fontFamily: appFonts.regular, fontSize: 10, lineHeight: 15, marginTop: 2 },
  graphBody: { marginTop: 10, gap: 4 },
  graphRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  graphDay: { width: 24, fontFamily: appFonts.extrabold, fontSize: 11, lineHeight: 15 },
  graphTrack: {
    flex: 1,
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  graphHourLine: { position: 'absolute', top: 0, bottom: 0, width: 1, opacity: 0.6 },
  graphFreeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  graphFree: { fontFamily: appFonts.regular, fontSize: 10, lineHeight: 14 },
  graphBlock: {
    position: 'absolute',
    height: 22,
    borderRadius: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  graphBlockText: { fontFamily: appFonts.bold, fontSize: 9, lineHeight: 12 },
  graphResizeHint: {
    position: 'absolute',
    right: 2,
    top: 4,
    bottom: 4,
    width: 2,
    borderRadius: 1,
    opacity: 0.7,
  },
  graphCreatePreview: {
    position: 'absolute',
    top: 4,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingHorizontal: 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  graphAxis: { flexDirection: 'row', gap: 8, marginTop: 2 },
  graphAxisSpacer: { width: 24 },
  graphAxisTrack: { flex: 1, position: 'relative', height: 14 },
  graphAxisLabel: {
    position: 'absolute',
    top: 0,
    fontFamily: appFonts.semibold,
    fontSize: 9,
    lineHeight: 12,
  },
  chooserRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chooserChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chooserChipText: { fontFamily: appFonts.semibold, fontSize: 11, lineHeight: 16 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetPanel: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 6,
  },
  sheetContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  actionPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 8,
  },
  actionTitle: { fontFamily: appFonts.extrabold, fontSize: 16, lineHeight: 22 },
  actionSubtitle: {
    fontFamily: appFonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 4,
  },
  actionButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  actionButtonText: {
    fontFamily: appFonts.bold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionCancel: { paddingVertical: 12, alignItems: 'center' },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  inspectorHeading: { flexShrink: 1, flex: 1 },
  inspectorTitle: { fontFamily: appFonts.extrabold, fontSize: 16, lineHeight: 22 },
  inspectorSubtitle: {
    fontFamily: appFonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  inspectorActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  miniButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  miniText: { fontFamily: appFonts.bold, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  selectionHint: {
    fontFamily: appFonts.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
