import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useBooking, useBookingGroup, useCurrentUser, usePetsByIds } from '@pfotennetz/supabase';
import {
  AppHeader,
  BackButton,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../../components/ui';
import { PetEmergencyCard } from '../../../components/pet-emergency-card';
import {
  loadBookingEmergencyPets,
  loadEmergencyCardSnapshot,
  saveBookingEmergencyPets,
  saveEmergencyCardSnapshot,
  type EmergencyCardSnapshot,
} from '../../../lib/emergency-cache';
import {
  buildEmergencyCardSnapshot,
  petToEmergencyCardData,
  snapshotToEmergencyCardData,
} from '../../../lib/pet-emergency';

/**
 * Emergency cards of the pets in one booking. The helper sees this data
 * automatically once the owner has confirmed the booking; no public link or
 * extra sharing step is needed.
 */
export default function BookingEmergencyCardsScreen() {
  const c = usePalette();
  const { bookingId: rawBookingId } = useLocalSearchParams<{ bookingId: string }>();
  const bookingId =
    typeof rawBookingId === 'string' && rawBookingId.length > 0 ? rawBookingId : undefined;

  const bookingQuery = useBooking(bookingId);
  const userQuery = useCurrentUser();
  const booking = bookingQuery.data ?? null;
  const groupQuery = useBookingGroup(booking?.booking_group_id);

  const isHelper =
    booking !== null && booking.helper_id !== null && booking.helper_id === userQuery.data?.id;
  const careActive = booking?.status === 'confirmed' || booking?.status === 'in_progress';
  const canView = isHelper && careActive;

  const petIds = useMemo(() => {
    const groupBookings = groupQuery.data ?? (booking ? [booking] : []);
    const ids: string[] = [];
    for (const item of groupBookings) {
      if (item.pet !== null && !ids.includes(item.pet.id)) ids.push(item.pet.id);
    }
    return ids;
  }, [groupQuery.data, booking]);
  const petIdsKey = petIds.join(',');

  const petsQuery = usePetsByIds(canView ? petIds : []);
  const [cachedSnapshots, setCachedSnapshots] = useState<EmergencyCardSnapshot[]>([]);

  // Keep a copy on the device so the cards stay readable without a connection.
  useEffect(() => {
    const pets = petsQuery.data;
    if (!pets || bookingId === undefined) return;
    for (const pet of pets) {
      void saveEmergencyCardSnapshot(buildEmergencyCardSnapshot(pet)).catch(() => undefined);
    }
    const expiresAt =
      booking === null
        ? null
        : new Date(new Date(booking.end_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    void saveBookingEmergencyPets(
      bookingId,
      pets.map((pet) => pet.id),
      expiresAt
    ).catch(() => undefined);
  }, [petsQuery.data, bookingId, booking]);

  useEffect(() => {
    if (bookingId === undefined) return;
    let active = true;
    void (async () => {
      // Without a loaded booking the cached pet ids are the only way back to
      // the snapshots that were stored while the helper was authorized.
      const ids =
        petIdsKey === '' ? await loadBookingEmergencyPets(bookingId) : petIdsKey.split(',');
      const snapshots = await Promise.all(ids.map((petId) => loadEmergencyCardSnapshot(petId)));
      if (!active) return;
      setCachedSnapshots(
        snapshots.filter((snapshot): snapshot is EmergencyCardSnapshot => snapshot !== null)
      );
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bookingId, petIdsKey]);

  const liveCards = useMemo(() => {
    const pets = petsQuery.data ?? [];
    const byId = new Map(pets.map((pet) => [pet.id, pet]));
    return petIds.flatMap((petId) => {
      const pet = byId.get(petId);
      return pet ? [petToEmergencyCardData(pet)] : [];
    });
  }, [petsQuery.data, petIds]);

  const petNames = useMemo(() => {
    const groupBookings = groupQuery.data ?? (booking ? [booking] : []);
    return groupBookings.flatMap((item) => (item.pet !== null ? [item.pet.name] : []));
  }, [groupQuery.data, booking]);

  const offline = petsQuery.isError && cachedSnapshots.length > 0;
  const showCached = liveCards.length === 0 && cachedSnapshots.length > 0;
  // The booking or session could not be refreshed (for example offline). The
  // cached snapshots were written while this helper was authorized, so they
  // remain the best available source.
  const offlineFallback =
    cachedSnapshots.length > 0 && (booking === null || bookingQuery.isError || userQuery.isError);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <BackButton onPress={() => router.back()} />
      <AppHeader
        title="Notfallkarten"
        subtitle={
          petNames.length > 0
            ? `Betreuung von ${petNames.join(', ')}.`
            : 'Notfallkarten der betreuten Tiere.'
        }
      />

      {bookingId === undefined ? (
        <ErrorBox message="Keine Betreuungs-ID angegeben." />
      ) : offlineFallback ? (
        <>
          <Text
            style={[
              styles.offlineBanner,
              { color: c.onErrorContainer, backgroundColor: c.errorContainer },
            ]}
          >
            Die Betreuungsdaten konnten nicht aktualisiert werden. Angezeigt werden die zuletzt
            gespeicherten Notfallkarten.
          </Text>
          {cachedSnapshots.map((snapshot) => (
            <PetEmergencyCard
              key={snapshot.petId}
              card={snapshotToEmergencyCardData(snapshot)}
              offlineSavedAt={snapshot.savedAt}
            />
          ))}
        </>
      ) : bookingQuery.isPending || userQuery.isPending ? (
        <LoadingView label="Notfallkarten werden geladen …" />
      ) : bookingQuery.isError ? (
        <ErrorBox
          message={`Betreuung konnte nicht geladen werden: ${bookingQuery.error.message}`}
          onRetry={() => {
            void bookingQuery.refetch();
          }}
        />
      ) : booking === null ? (
        <ErrorBox message="Betreuung nicht gefunden." />
      ) : !isHelper ? (
        <EmptyText>
          Diese Notfallkarten sind nur für die helfende Person der Betreuung sichtbar.
        </EmptyText>
      ) : !careActive ? (
        <EmptyText>
          {booking.status === 'completed'
            ? 'Die Betreuung ist abgeschlossen. Die Notfallkarten stehen nur während einer laufenden Betreuung bereit.'
            : 'Die Notfallkarten werden automatisch freigeschaltet, sobald die Betreuung bestätigt ist.'}
        </EmptyText>
      ) : petsQuery.isPending && cachedSnapshots.length === 0 ? (
        <LoadingView label="Notfallkarten werden geladen …" />
      ) : petsQuery.isError && cachedSnapshots.length === 0 ? (
        <ErrorBox
          message={`Notfallkarten konnten nicht geladen werden: ${petsQuery.error.message}`}
          onRetry={() => {
            void petsQuery.refetch();
          }}
        />
      ) : (
        <>
          <Card accentColor={c.error}>
            <SectionTitle>Automatisch freigeschaltet</SectionTitle>
            <EmptyText>
              Diese Notfallkarten gehören zu den Tieren deiner Betreuung. Medikamente, Allergien und
              Tierarztkontakte stehen dir hier ohne zusätzlichen Link zur Verfügung. Nach dem ersten
              Laden bleibt die Karte auch offline lesbar.
            </EmptyText>
          </Card>
          {showCached
            ? cachedSnapshots.map((snapshot) => (
                <PetEmergencyCard
                  key={snapshot.petId}
                  card={snapshotToEmergencyCardData(snapshot)}
                  offlineSavedAt={offline ? snapshot.savedAt : null}
                />
              ))
            : liveCards.map((card) => <PetEmergencyCard key={card.petId} card={card} />)}
          {!offline && liveCards.length === 0 && cachedSnapshots.length === 0 ? (
            <EmptyText>Für diese Betreuung sind noch keine Notfallkarten hinterlegt.</EmptyText>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { paddingBottom: 40 },
  offlineBanner: {
    borderRadius: 12,
    fontFamily: appFonts.semibold,
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
    marginBottom: 18,
  },
});
