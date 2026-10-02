import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  contactRequestErrorMessage,
  useCreateContactRequest,
  useHelperDetail,
} from '@pfotennetz/supabase';
import { bookingTypeLabels } from '../../lib/booking';
import { formatAvailableDays } from '../../lib/helper-map';
import {
  ActionButton,
  AppHeader,
  BackButton,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

function trustLabel(trustLevel: string): string {
  if (trustLevel === 'gold') return 'Gold-verifiziert';
  if (trustLevel === 'silver') return 'Silber-verifiziert';
  return trustLevel;
}

export default function HelperDetailScreen() {
  const c = usePalette();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const helperId = Array.isArray(rawId) ? (rawId[0] ?? null) : (rawId ?? null);
  const detailQuery = useHelperDetail(helperId);
  const detail = detailQuery.data ?? null;
  const createContact = useCreateContactRequest();
  const [contactMessage, setContactMessage] = useState(
    'Hallo, ich würde dich gern vorab kennenlernen und die Betreuung besprechen.'
  );
  const [contactSent, setContactSent] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader title="Helfer-Profil" subtitle="Verifiziert, erfahren und in deiner Nähe." />
        <BackButton onPress={() => router.back()} />

        {detailQuery.isPending ? (
          <LoadingView label="Helper-Profil wird geladen …" />
        ) : detailQuery.isError ? (
          <ErrorBox
            message={`Profil konnte nicht geladen werden: ${detailQuery.error.message}`}
            onRetry={() => {
              void detailQuery.refetch();
            }}
          />
        ) : detail === null ? (
          <Card>
            <EmptyText>Helper nicht gefunden.</EmptyText>
          </Card>
        ) : (
          <>
            <Card>
              <View style={styles.header}>
                <View style={[styles.avatar, { backgroundColor: c.surfaceContainerHigh }]}>
                  <Text style={[styles.avatarText, { color: c.primary }]}>
                    {detail.display_name.trim().slice(0, 1).toUpperCase() || '🐾'}
                  </Text>
                </View>
                <View style={styles.headerMain}>
                  <Text style={[styles.name, { color: c.onSurface }]}>{detail.display_name}</Text>
                  <Text style={[styles.trust, { color: c.onSurfaceVariant }]}>
                    {trustLabel(detail.trust_level)}
                  </Text>
                </View>
              </View>
              <InfoRow
                label="Bewertung"
                value={
                  Number(detail.rating) > 0
                    ? `${Number(detail.rating).toFixed(1)} / 5`
                    : 'Noch keine'
                }
              />
              <InfoRow
                label="Entfernung"
                value={
                  detail.distance_km === null
                    ? '–'
                    : `${Number(detail.distance_km).toLocaleString('de-DE')} km (ca.)`
                }
              />
              <InfoRow label="Abgeschlossene Einsätze" value={String(detail.total_walks)} />
              <InfoRow
                label="Regelmäßig verfügbar"
                value={formatAvailableDays(detail.available_days)}
              />
            </Card>

            <Card>
              <SectionTitle>Unverbindlich kennenlernen</SectionTitle>
              <Text style={[styles.privacy, { color: c.onSurfaceVariant }]}>
                Sende zuerst eine Nachricht über PfotenNetz. Telefonnummern und Adressen bleiben
                dabei geschützt; eine Buchung ist damit noch nicht verbunden.
              </Text>
              <TextInput
                editable={!createContact.isPending && !contactSent}
                multiline
                onChangeText={setContactMessage}
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={contactMessage}
              />
              {createContact.isError ? (
                <ErrorBox
                  message={`Kontaktanfrage konnte nicht gesendet werden: ${contactRequestErrorMessage(createContact.error)}`}
                />
              ) : null}
              {contactSent ? (
                <Text style={[styles.privacy, { color: c.secondary }]}>
                  Kontaktanfrage gesendet. Warte auf eine Antwort.
                </Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={createContact.isPending}
                  onPress={() => {
                    if (helperId)
                      createContact.mutate(
                        { helperId, message: contactMessage },
                        { onSuccess: () => setContactSent(true) }
                      );
                  }}
                  style={[styles.contactButton, { backgroundColor: c.secondary }]}
                >
                  <Text style={[styles.contactButtonText, { color: c.onSecondary }]}>
                    {createContact.isPending ? 'Wird gesendet …' : 'Kennenlernen anfragen'}
                  </Text>
                </Pressable>
              )}
            </Card>

            <Card>
              <SectionTitle>Verfügbarkeiten</SectionTitle>
              {detail.slots.length === 0 ? (
                <EmptyText>Aktuell keine aktiven Zeitfenster hinterlegt.</EmptyText>
              ) : (
                detail.slots.map((slot, index) => (
                  <View key={`${slot.day_of_week}-${slot.start_time}-${index}`} style={styles.slot}>
                    <Text style={[styles.slotDay, { color: c.onSurface }]}>
                      {WEEKDAYS[slot.day_of_week] ?? '?'} · {slot.start_time.slice(0, 5)}–
                      {slot.end_time.slice(0, 5)} Uhr
                    </Text>
                    <Text style={[styles.slotMeta, { color: c.onSurfaceVariant }]}>
                      {(slot.booking_types as string[])
                        .map((t) => bookingTypeLabels[t as keyof typeof bookingTypeLabels] ?? t)
                        .join(', ')}{' '}
                      · bis {Number(slot.max_distance_km).toLocaleString('de-DE')} km
                    </Text>
                  </View>
                ))
              )}
              <Text style={[styles.privacy, { color: c.onSurfaceVariant }]}>
                Aus Datenschutzgründen siehst du nur die ungefähre Position (ca. 100 m gerundet).
              </Text>
            </Card>

            <ActionButton
              title="Betreuung anfragen"
              onPress={() => {
                router.push({ pathname: '/booking/new', params: { helperId: detail.helper_id } });
              }}
            />
            <ActionButton
              title="Zurück zur Karte"
              variant="secondary"
              onPress={() => {
                router.back();
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: appFonts.extrabold, fontSize: 24 },
  headerMain: { flex: 1 },
  name: { fontFamily: appFonts.extrabold, fontSize: 20, lineHeight: 28 },
  trust: { fontFamily: appFonts.semibold, fontSize: 13, lineHeight: 18, marginTop: 2 },
  slot: { paddingVertical: 8 },
  slotDay: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  slotMeta: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
  privacy: { fontFamily: appFonts.regular, fontSize: 11, marginTop: 12, lineHeight: 17 },
  messageInput: {
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    fontFamily: appFonts.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  contactButton: {
    borderRadius: 16,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  contactButtonText: { fontFamily: appFonts.bold, fontSize: 14 },
});
