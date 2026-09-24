import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import {
  AVAILABILITY_BOOKING_TYPES,
  useCreateAvailability,
  useDeleteAvailability,
  useOwnAvailabilities,
  useUpdateAvailability,
  type Availability,
  type UpsertAvailabilityInput,
} from '@pfotennetz/supabase';
import type { BookingType } from '@pfotennetz/supabase';
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

const WEEKDAYS = [
  { value: 0, label: 'So' },
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
] as const;

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2)
    .toString()
    .padStart(2, '0');
  const minute = index % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

function TimeDropdown({
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

  return (
    <View style={styles.dropdownContainer}>
      <Text style={[styles.label, { color: c.onSurface }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} auswählen`}
        accessibilityState={{ expanded: open }}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={[
          styles.dropdownButton,
          { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
        ]}
      >
        <Text style={[styles.dropdownValue, { color: c.onSurface }]}>{value} Uhr</Text>
        <Text style={[styles.dropdownArrow, { color: c.onSurfaceVariant }]}>
          {open ? '▲' : '▼'}
        </Text>
      </Pressable>
      {open ? (
        <View
          style={[
            styles.dropdownMenu,
            { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant },
          ]}
        >
          {TIME_OPTIONS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: option === value }}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={[
                styles.dropdownOption,
                { backgroundColor: option === value ? c.primaryContainer : 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  { color: option === value ? c.onPrimaryContainer : c.onSurface },
                ]}
              >
                {option} Uhr
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SlotRow({ slot }: { slot: Availability }) {
  const c = usePalette();
  const update = useUpdateAvailability();
  const remove = useDeleteAvailability();
  const day = WEEKDAYS.find((d) => d.value === slot.day_of_week)?.label ?? '?';
  const types = (slot.booking_types as BookingType[])
    .map((t) => bookingTypeLabels[t] ?? t)
    .join(', ');

  return (
    <View style={styles.slot}>
      <View style={styles.slotMain}>
        <Text style={[styles.slotDay, { color: c.onSurface }]}>
          {day} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} Uhr
        </Text>
        <Text style={[styles.slotMeta, { color: c.onSurfaceVariant }]}>
          {types} · bis {Number(slot.max_distance_km).toLocaleString('de-DE')} km ·{' '}
          {slot.is_active ? 'aktiv' : 'pausiert'}
        </Text>
        {update.isError ? (
          <Text style={[styles.inlineError, { color: c.error }]}>{update.error.message}</Text>
        ) : null}
        {remove.isError ? (
          <Text style={[styles.inlineError, { color: c.error }]}>{remove.error.message}</Text>
        ) : null}
      </View>
      <View style={styles.slotActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Verfügbarkeit ${slot.is_active ? 'pausieren' : 'aktivieren'}`}
          disabled={update.isPending || remove.isPending}
          onPress={() => {
            update.mutate({ id: slot.id, input: { isActive: !slot.is_active } });
          }}
          style={[styles.miniButton, { backgroundColor: c.surfaceContainerHigh }]}
        >
          <Text style={[styles.miniText, { color: c.onSurface }]}>
            {slot.is_active ? 'Pausieren' : 'Aktivieren'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Verfügbarkeit löschen"
          disabled={update.isPending || remove.isPending}
          onPress={() => {
            remove.mutate(slot.id);
          }}
          style={[styles.miniButton, { backgroundColor: c.errorContainer }]}
        >
          <Text style={[styles.miniText, { color: c.onErrorContainer }]}>Löschen</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AvailabilityManager() {
  const c = usePalette();
  const listQuery = useOwnAvailabilities();
  const create = useCreateAvailability();

  const [days, setDays] = useState<number[]>([1]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [types, setTypes] = useState<BookingType[]>(['walk']);
  const [radius, setRadius] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);

  const toggleType = (type: BookingType) => {
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const handleCreate = () => {
    setFormError(null);
    if (days.length === 0) {
      setFormError('Bitte wähle mindestens einen Wochentag.');
      return;
    }

    const input = (dayOfWeek: number): UpsertAvailabilityInput => ({
      dayOfWeek,
      startTime: start,
      endTime: end,
      bookingTypes: types,
      maxDistanceKm: Number(radius.replace(',', '.')),
    });

    void Promise.all(days.map((dayOfWeek) => create.mutateAsync(input(dayOfWeek)))).catch(() => {
      // The mutation exposes the server-side validation error in the form below.
    });
  };

  return (
    <Card>
      <SectionTitle>Meine Verfügbarkeiten</SectionTitle>
      {listQuery.isPending ? (
        <LoadingView label="Verfügbarkeiten werden geladen …" />
      ) : listQuery.isError ? (
        <ErrorBox
          message={`Verfügbarkeiten konnten nicht geladen werden: ${listQuery.error.message}`}
          onRetry={() => {
            void listQuery.refetch();
          }}
        />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyText>
          Noch keine Zeitfenster hinterlegt. Lege unten dein erstes regelmäßiges Zeitfenster an –
          nur mit aktivem Zeitfenster wirst du auf der Karte gefunden.
        </EmptyText>
      ) : (
        (listQuery.data ?? []).map((slot) => <SlotRow key={slot.id} slot={slot} />)
      )}

      <Text style={[styles.label, { color: c.onSurface }]}>Wochentage</Text>
      <View style={styles.chipRow}>
        {WEEKDAYS.map((d) => {
          const selected = days.includes(d.value);
          return (
            <Pressable
              key={d.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={create.isPending}
              onPress={() => {
                setDays((current) =>
                  current.includes(d.value)
                    ? current.filter((value) => value !== d.value)
                    : [...current, d.value]
                );
              }}
              style={[
                styles.chip,
                { backgroundColor: selected ? c.primary : c.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}>
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <TimeDropdown label="Von" value={start} disabled={create.isPending} onChange={setStart} />
        </View>
        <View style={styles.column}>
          <TimeDropdown label="Bis" value={end} disabled={create.isPending} onChange={setEnd} />
        </View>
      </View>

      <Text style={[styles.label, { color: c.onSurface }]}>Betreuungsarten</Text>
      <View style={styles.chipRow}>
        {AVAILABILITY_BOOKING_TYPES.map((type) => {
          const selected = types.includes(type);
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={create.isPending}
              onPress={() => {
                toggleType(type);
              }}
              style={[
                styles.chip,
                { backgroundColor: selected ? c.primary : c.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}>
                {bookingTypeLabels[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: c.onSurface }]}>Maximalradius (km)</Text>
      <TextInput
        editable={!create.isPending}
        keyboardType="decimal-pad"
        onChangeText={setRadius}
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
        value={radius}
      />

      {formError ? <ErrorBox message={formError} /> : null}
      {create.isError ? (
        <ErrorBox message={`Speichern fehlgeschlagen: ${create.error.message}`} />
      ) : null}
      <ActionButton
        title="Zeitfenster speichern"
        pending={create.isPending}
        onPress={handleCreate}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: appFonts.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
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
  dropdownArrow: { fontSize: 11 },
  dropdownMenu: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    maxHeight: 220,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 10,
    elevation: 6,
  },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownOptionText: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  slot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  slotMain: { flex: 1, flexShrink: 1 },
  slotDay: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  slotMeta: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
  inlineError: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 4 },
  slotActions: { gap: 6, justifyContent: 'center' },
  miniButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  miniText: { fontFamily: appFonts.bold, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
