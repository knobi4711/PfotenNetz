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

  const [day, setDay] = useState<number>(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [types, setTypes] = useState<BookingType[]>(['walk']);
  const [radius, setRadius] = useState('5');

  const toggleType = (type: BookingType) => {
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const handleCreate = () => {
    const input: UpsertAvailabilityInput = {
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      bookingTypes: types,
      maxDistanceKm: Number(radius.replace(',', '.')),
    };
    create.mutate(input);
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

      <Text style={[styles.label, { color: c.onSurface }]}>Wochentag</Text>
      <View style={styles.chipRow}>
        {WEEKDAYS.map((d) => {
          const selected = d.value === day;
          return (
            <Pressable
              key={d.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={create.isPending}
              onPress={() => {
                setDay(d.value);
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
          <Text style={[styles.label, { color: c.onSurface }]}>Von (HH:MM)</Text>
          <TextInput
            editable={!create.isPending}
            onChangeText={setStart}
            placeholder="09:00"
            placeholderTextColor={c.outline}
            style={[
              styles.input,
              {
                backgroundColor: c.surfaceContainerLow,
                borderColor: c.outlineVariant,
                color: c.onSurface,
              },
            ]}
            value={start}
          />
        </View>
        <View style={styles.column}>
          <Text style={[styles.label, { color: c.onSurface }]}>Bis (HH:MM)</Text>
          <TextInput
            editable={!create.isPending}
            onChangeText={setEnd}
            placeholder="12:00"
            placeholderTextColor={c.outline}
            style={[
              styles.input,
              {
                backgroundColor: c.surfaceContainerLow,
                borderColor: c.outlineVariant,
                color: c.onSurface,
              },
            ]}
            value={end}
          />
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
  label: { fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontSize: 14, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  slot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  slotMain: { flex: 1, flexShrink: 1 },
  slotDay: { fontSize: 15, fontWeight: '700' },
  slotMeta: { fontSize: 13, marginTop: 2 },
  inlineError: { fontSize: 13, marginTop: 4 },
  slotActions: { gap: 6, justifyContent: 'center' },
  miniButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  miniText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
