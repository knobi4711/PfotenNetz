import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  type CareLocation,
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
  appFonts,
  usePalette,
} from '../../components/ui';

const CURRENCIES: { value: BookingCurrency; label: string }[] = [
  { value: 'KIEZ_HOURS', label: 'Nachbarschafts-Stunden' },
  { value: 'EUR', label: 'Euro' },
  { value: 'PER_VISIT', label: 'Pro Besuch' },
];

function formatDateInput(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function dateFromInput(value: string): Date {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (match !== null) {
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

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

  const [petIds, setPetIds] = useState<string[]>([]);
  const [bookingType, setBookingType] = useState<BookingType>('walk');
  const [careLocation, setCareLocation] = useState<CareLocation>('at_owner_home');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [currency, setCurrency] = useState<BookingCurrency>('KIEZ_HOURS');
  const [price, setPrice] = useState('');
  const [meetingAddress, setMeetingAddress] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [formHint, setFormHint] = useState<string | null>(null);

  const pets = (petsQuery.data ?? []).filter((pet) => pet.is_active && !pet.is_deceased);
  const pending = createBooking.isPending;

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setDatePicker(null);
      return;
    }
    if (selectedDate !== undefined) {
      if (datePicker === 'start') setStartDate(formatDateInput(selectedDate));
      if (datePicker === 'end') setEndDate(formatDateInput(selectedDate));
    }
    setDatePicker(null);
  };

  const handleCreate = () => {
    if (petIds.length === 0) {
      setFormHint('Bitte wähle mindestens ein Tier aus.');
      return;
    }
    if (!safetyConfirmed) {
      setFormHint('Bitte bestätige die Hinweise zu Kennenlernen, Haftung und Versicherungsschutz.');
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
    if ((currency === 'EUR' || currency === 'PER_VISIT') && priceValue <= 0) {
      setFormHint(
        currency === 'PER_VISIT'
          ? 'Bitte gib einen Preis pro Besuch über 0 € an.'
          : 'Bitte gib einen Preis über 0 € an.'
      );
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
        petIds,
        startAt,
        endAt,
        meetingAddress: meetingAddress.trim() === '' ? null : meetingAddress.trim(),
        currency,
        priceEur: currency === 'EUR' || currency === 'PER_VISIT' ? priceValue : undefined,
        priceKiezHours: currency === 'KIEZ_HOURS' ? priceValue : undefined,
        helperId: helper?.helper_id ?? undefined,
        isUrgent,
        careNotes: careNotes.trim() || null,
        careLocation,
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
        <Text style={[styles.title, { color: c.onSurface }]}>Neue Betreuung buchen</Text>
        <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>
          Erstelle eine Betreuungsanfrage für eines oder mehrere deiner Tiere. Mehrere ausgewählte
          Tiere werden als ein gemeinsamer Antrag an den Helper gesendet.
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
            <SectionTitle>Tiere</SectionTitle>
            {pets.length === 0 ? (
              <EmptyText>
                Du hast noch kein aktives Tier. Lege zuerst unter „Tiere“ ein Tier an.
              </EmptyText>
            ) : (
              <View style={styles.selectionList}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: pets.length > 0 && petIds.length === pets.length }}
                  disabled={pending}
                  onPress={() => {
                    setPetIds((selected) =>
                      selected.length === pets.length ? [] : pets.map((pet) => pet.id)
                    );
                  }}
                  style={styles.selectionRow}
                >
                  <Text
                    style={[
                      styles.checkbox,
                      { color: petIds.length === pets.length ? c.primary : c.outline },
                    ]}
                  >
                    {petIds.length === pets.length ? '☑' : '☐'}
                  </Text>
                  <Text style={[styles.selectionText, { color: c.onSurface }]}>
                    Alle Tiere auswählen
                  </Text>
                </Pressable>
                {pets.map((pet) => {
                  const selected = petIds.includes(pet.id);
                  return (
                    <Pressable
                      key={pet.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      disabled={pending}
                      onPress={() => {
                        setPetIds((current) =>
                          selected ? current.filter((id) => id !== pet.id) : [...current, pet.id]
                        );
                      }}
                      style={[
                        styles.selectionRow,
                        {
                          opacity: pending ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.checkbox, { color: selected ? c.primary : c.outline }]}>
                        {selected ? '☑' : '☐'}
                      </Text>
                      <Text style={[styles.selectionText, { color: c.onSurface }]}>{pet.name}</Text>
                    </Pressable>
                  );
                })}
                <Text style={[styles.helperMeta, { color: c.onSurfaceVariant }]}>
                  Mehrere Tiere werden beim Helper als ein Antrag angezeigt.
                </Text>
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
          {bookingType === 'vacation' || bookingType === 'daycare' ? (
            <>
              <Text style={[styles.label, { color: c.onSurface }]}>Betreuungsort</Text>
              <Text style={[styles.helperMeta, { color: c.onSurfaceVariant }]}>
                Wähle, ob dein Tier bei dir besucht wird oder während deiner Abwesenheit beim Helper
                wohnt.
              </Text>
              <View style={styles.chipRow}>
                {(
                  [
                    ['at_owner_home', 'Bei mir zu Hause (Besuche)'],
                    ['at_owner_home_live_in', 'Bei mir zu Hause – Helper zieht vorübergehend ein'],
                    ['at_helper_home', 'Beim Helper zu Hause'],
                  ] as const
                ).map(([value, label]) => {
                  const selected = careLocation === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      disabled={pending}
                      onPress={() => setCareLocation(value)}
                      style={[
                        styles.chip,
                        { backgroundColor: selected ? c.primary : c.surfaceContainerHigh },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </Card>

        <Card>
          <SectionTitle>Zeitraum</SectionTitle>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Text style={[styles.label, { color: c.onSurface }]}>Start-Datum</Text>
              <Pressable
                accessibilityLabel="Start-Datum auswählen"
                accessibilityRole="button"
                disabled={pending}
                onPress={() => setDatePicker(datePicker === 'start' ? null : 'start')}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[styles.dateInputText, { color: startDate ? c.onSurface : c.outline }]}
                >
                  {startDate || 'TT.MM.JJJJ'}
                </Text>
              </Pressable>
              {datePicker === 'start' ? (
                <DateTimePicker
                  value={dateFromInput(startDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  locale="de-DE"
                  onChange={handleDateChange}
                />
              ) : null}
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
              <Pressable
                accessibilityLabel="End-Datum auswählen"
                accessibilityRole="button"
                disabled={pending}
                onPress={() => setDatePicker(datePicker === 'end' ? null : 'end')}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                  },
                ]}
              >
                <Text style={[styles.dateInputText, { color: endDate ? c.onSurface : c.outline }]}>
                  {endDate || 'TT.MM.JJJJ'}
                </Text>
              </Pressable>
              {datePicker === 'end' ? (
                <DateTimePicker
                  value={dateFromInput(endDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  locale="de-DE"
                  onChange={handleDateChange}
                />
              ) : null}
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
            {currency === 'EUR'
              ? 'Preis in €'
              : currency === 'PER_VISIT'
                ? 'Preis pro Besuch in €'
                : 'Stunden (0 = Gefallen ohne Abrechnung)'}
          </Text>
          <TextInput
            editable={!pending}
            keyboardType="decimal-pad"
            onChangeText={setPrice}
            onSubmitEditing={handleCreate}
            placeholder={currency === 'KIEZ_HOURS' ? 'z. B. 2' : 'z. B. 12,50'}
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
          <Text style={[styles.label, { color: c.onSurface }]}>Bedürfnisse und Hinweise</Text>
          <TextInput
            editable={!pending}
            multiline
            onChangeText={setCareNotes}
            placeholder="z. B. Medikamente, Verträglichkeit, Fütterung"
            placeholderTextColor={c.outline}
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: c.surfaceContainerLow,
                borderColor: c.outlineVariant,
                color: c.onSurface,
              },
            ]}
            value={careNotes}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isUrgent }}
            onPress={() => setIsUrgent((value) => !value)}
            style={styles.noticeRow}
          >
            <Text style={[styles.checkbox, { color: isUrgent ? c.primary : c.outline }]}>
              {isUrgent ? '☑' : '☐'}
            </Text>
            <Text style={[styles.noticeText, { color: c.onSurface }]}>
              Dringender Betreuungsfall (nur bei tatsächlichem Zeitdruck)
            </Text>
          </Pressable>
        </Card>

        <Card>
          <SectionTitle>Sicherheit vor dem ersten Sitten</SectionTitle>
          <Text style={[styles.helperMeta, { color: c.onSurfaceVariant }]}>
            Vereinbare vor der ersten Betreuung ein persönliches Probetreffen, teile private
            Kontaktdaten erst im geschützten Chat und prüfe deinen eigenen Versicherungsschutz –
            insbesondere bei Fremdhütung.
          </Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: safetyConfirmed }}
            onPress={() => setSafetyConfirmed((value) => !value)}
            style={styles.noticeRow}
          >
            <Text style={[styles.checkbox, { color: safetyConfirmed ? c.primary : c.outline }]}>
              {safetyConfirmed ? '☑' : '☐'}
            </Text>
            <Text style={[styles.noticeText, { color: c.onSurface }]}>
              Ich habe die Hinweise gelesen und akzeptiere die Nutzungsbedingungen.
            </Text>
          </Pressable>
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
  content: { padding: 16, paddingBottom: 40 },
  title: { fontFamily: appFonts.extrabold, fontSize: 28, lineHeight: 36, marginBottom: 4 },
  subtitle: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  helperName: { fontFamily: appFonts.extrabold, fontSize: 16, lineHeight: 22 },
  helperMeta: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 4 },
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
  dateInputText: {
    fontFamily: appFonts.regular,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 1,
  },
  multiline: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  checkbox: { fontSize: 22, lineHeight: 24 },
  noticeText: { flex: 1, fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20 },
  hint: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  selectionList: { gap: 4, marginTop: 4 },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 6,
  },
  selectionText: { fontFamily: appFonts.semibold, fontSize: 14, lineHeight: 20 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
});
