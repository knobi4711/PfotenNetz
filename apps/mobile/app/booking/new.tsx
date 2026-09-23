import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BOOKING_TYPES,
  isBookingCoveredByAvailabilities,
  useCreateBooking,
  useHelperDetail,
  useOwnPets,
  type BookingCurrency,
  type BookingType,
} from '@pfotennetz/supabase';
import { bookingTypeLabels } from '../../lib/booking';
import { parseGermanDateTime } from '../../lib/datetime';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  usePalette,
} from '../../components/ui';

const CURRENCIES: { value: BookingCurrency; label: string }[] = [
  { value: 'KIEZ_HOURS', label: 'Nachbarschafts-Stunden' },
  { value: 'EUR', label: 'Euro' },
];

export default function NewBookingScreen() {
  const c = usePalette();
  const params = useLocalSearchParams<{ helperId?: string | string[] }>();
  const rawHelperId = params.helperId;
  const preselectedHelperId = Array.isArray(rawHelperId)
    ? (rawHelperId[0] ?? null)
    : (rawHelperId ?? null);
  const helperQuery = useHelperDetail(preselectedHelperId);
  const helper = helperQuery.data ?? null;
  const petsQuery = useOwnPets();
  const createBooking = useCreateBooking();

  const [petId, setPetId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('walk');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [currency, setCurrency] = useState<BookingCurrency>('KIEZ_HOURS');
  const [price, setPrice] = useState('');
  const [meetingAddress, setMeetingAddress] = useState('');
  const [formHint, setFormHint] = useState<string | null>(null);

  const pets = (petsQuery.data ?? []).filter((pet) => pet.is_active);
  const pending = createBooking.isPending;

  const handleCreate = () => {
    if (petId === null) {
      setFormHint('Bitte wähle ein Tier aus.');
      return;
    }
    const startAt = parseGermanDateTime(startDate, startTime);
    const endAt = parseGermanDateTime(endDate, endTime);
    if (startAt === null || endAt === null) {
      setFormHint('Bitte gib Start und Ende als TT.MM.JJJJ und HH:MM an.');
      return;
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setFormHint('Das Ende muss nach dem Beginn liegen.');
      return;
    }
    const normalizedPrice = price.trim().replace(',', '.');
    const priceValue = normalizedPrice === '' ? 0 : Number(normalizedPrice);
    if (normalizedPrice !== '' && (!Number.isFinite(priceValue) || priceValue < 0)) {
      setFormHint('Bitte gib einen gültigen Preis an.');
      return;
    }
    if (currency === 'EUR' && priceValue <= 0) {
      setFormHint('Bitte gib einen Preis über 0 € an.');
      return;
    }

    setFormHint(null);
    if (helper !== null) {
      const covered = isBookingCoveredByAvailabilities(helper.slots, {
        startAt,
        endAt,
        type: bookingType,
      });
      if (!covered) {
        setFormHint(
          'Der gewählte Zeitraum liegt außerhalb der Verfügbarkeit dieses Helpers. Passe Zeit oder Leistung an – oder sende die Anfrage ohne Helper.'
        );
        return;
      }
    }
    createBooking.mutate(
      {
        type: bookingType,
        petId,
        startAt,
        endAt,
        meetingAddress: meetingAddress.trim() === '' ? null : meetingAddress.trim(),
        currency,
        priceEur: currency === 'EUR' ? priceValue : undefined,
        priceKiezHours: currency === 'KIEZ_HOURS' ? priceValue : undefined,
        helperId: helper?.helper_id ?? undefined,
      },
      {
        onSuccess: (booking) => {
          router.replace({ pathname: '/booking/[id]', params: { id: booking.id } });
        },
      }
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.onSurface }]}>Neue Anfrage</Text>
        <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>
          Erstelle eine Betreuungsanfrage für eines deiner Tiere. Helfer:innen aus deiner
          Nachbarschaft können sie annehmen.
        </Text>

        {preselectedHelperId !== null ? (
          <Card>
            <SectionTitle>Ausgewählte:r Helper</SectionTitle>
            {helperQuery.isPending ? (
              <LoadingView label="Helper wird geladen …" />
            ) : helperQuery.isError ? (
              <ErrorBox
                message={`Helper konnte nicht geladen werden: ${helperQuery.error.message}`}
                onRetry={() => {
                  void helperQuery.refetch();
                }}
              />
            ) : helper !== null ? (
              <>
                <Text style={[styles.helperName, { color: c.onSurface }]}>
                  {helper.display_name} ·{' '}
                  {Number(helper.rating) > 0
                    ? `${Number(helper.rating).toFixed(1)} / 5`
                    : 'Noch keine Bewertung'}
                </Text>
                <Text style={[styles.helperMeta, { color: c.onSurfaceVariant }]}>
                  Der Termin wird gegen die Verfügbarkeit geprüft. Ohne Abdeckung wird die Anfrage
                  blockiert.
                </Text>
              </>
            ) : null}
          </Card>
        ) : null}

        {petsQuery.isPending ? (
          <LoadingView label="Tiere werden geladen …" />
        ) : petsQuery.isError ? (
          <ErrorBox
            message={`Tiere konnten nicht geladen werden: ${petsQuery.error.message}`}
            onRetry={() => {
              void petsQuery.refetch();
            }}
          />
        ) : (
          <Card>
            <SectionTitle>Tier</SectionTitle>
            {pets.length === 0 ? (
              <EmptyText>
                Du hast noch kein aktives Tier. Lege zuerst unter „Tiere“ ein Tier an.
              </EmptyText>
            ) : (
              <View style={styles.chipRow}>
                {pets.map((pet) => {
                  const selected = pet.id === petId;
                  return (
                    <Pressable
                      key={pet.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      disabled={pending}
                      onPress={() => {
                        setPetId(pet.id);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                          opacity: pending ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}
                      >
                        {pet.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>
        )}

        <Card>
          <SectionTitle>Leistung</SectionTitle>
          <View style={styles.chipRow}>
            {BOOKING_TYPES.map((type) => {
              const selected = type === bookingType;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={pending}
                  onPress={() => {
                    setBookingType(type);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                      opacity: pending ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}>
                    {bookingTypeLabels[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <SectionTitle>Zeitraum</SectionTitle>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Text style={[styles.label, { color: c.onSurface }]}>Start-Datum</Text>
              <TextInput
                editable={!pending}
                onChangeText={setStartDate}
                placeholder="TT.MM.JJJJ"
                placeholderTextColor={c.outline}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={startDate}
              />
            </View>
            <View style={styles.column}>
              <Text style={[styles.label, { color: c.onSurface }]}>Uhrzeit</Text>
              <TextInput
                editable={!pending}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                placeholderTextColor={c.outline}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={startTime}
              />
            </View>
          </View>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Text style={[styles.label, { color: c.onSurface }]}>End-Datum</Text>
              <TextInput
                editable={!pending}
                onChangeText={setEndDate}
                placeholder="TT.MM.JJJJ"
                placeholderTextColor={c.outline}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={endDate}
              />
            </View>
            <View style={styles.column}>
              <Text style={[styles.label, { color: c.onSurface }]}>Uhrzeit</Text>
              <TextInput
                editable={!pending}
                onChangeText={setEndTime}
                placeholder="HH:MM"
                placeholderTextColor={c.outline}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={endTime}
              />
            </View>
          </View>
        </Card>

        <Card>
          <SectionTitle>Vergütung</SectionTitle>
          <View style={styles.chipRow}>
            {CURRENCIES.map((option) => {
              const selected = option.value === currency;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={pending}
                  onPress={() => {
                    setCurrency(option.value);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                      opacity: pending ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.label, { color: c.onSurface }]}>
            {currency === 'EUR' ? 'Preis in €' : 'Stunden (0 = Gefallen ohne Abrechnung)'}
          </Text>
          <TextInput
            editable={!pending}
            keyboardType="decimal-pad"
            onChangeText={setPrice}
            onSubmitEditing={handleCreate}
            placeholder={currency === 'EUR' ? 'z. B. 12,50' : 'z. B. 2'}
            placeholderTextColor={c.outline}
            returnKeyType="go"
            style={[
              styles.input,
              {
                backgroundColor: c.surfaceContainerLow,
                borderColor: c.outlineVariant,
                color: c.onSurface,
              },
            ]}
            value={price}
          />
        </Card>

        <Card>
          <SectionTitle>Treffpunkt (optional)</SectionTitle>
          <TextInput
            editable={!pending}
            onChangeText={setMeetingAddress}
            placeholder="Adresse oder Treffpunkt"
            placeholderTextColor={c.outline}
            style={[
              styles.input,
              {
                backgroundColor: c.surfaceContainerLow,
                borderColor: c.outlineVariant,
                color: c.onSurface,
              },
            ]}
            value={meetingAddress}
          />
        </Card>

        {formHint !== null ? (
          <Text style={[styles.hint, { color: c.tertiary }]}>{formHint}</Text>
        ) : null}
        {createBooking.isError ? (
          <ErrorBox
            message={`Anfrage konnte nicht erstellt werden: ${createBooking.error.message}`}
          />
        ) : null}
        <ActionButton title="Anfrage erstellen" pending={pending} onPress={handleCreate} />
        <ActionButton
          title="Abbrechen"
          variant="secondary"
          disabled={pending}
          onPress={() => {
            router.back();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  helperName: { fontSize: 16, fontWeight: '800' },
  helperMeta: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  hint: { fontSize: 14, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontSize: 14, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
});
