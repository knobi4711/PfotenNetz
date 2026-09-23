import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useNearbyMissingPets, useOwnPets } from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  appFonts,
  usePalette,
} from '../../components/ui';

export default function MissingRadarScreen() {
  const c = usePalette();
  const pets = useOwnPets();
  const reports = useNearbyMissingPets();
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locate = () => {
    setLocationError(null);
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Standortfreigabe wurde nicht erteilt.');
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationReady(true);
    })().catch((cause: unknown) =>
      setLocationError(
        cause instanceof Error ? cause.message : 'Standort konnte nicht bestimmt werden.'
      )
    );
  };
  const ownPetIds = new Set((pets.data ?? []).map((pet) => pet.id));
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Vermissten-Radar" subtitle="Hilf Tieren in deiner Nachbarschaft." />
      <Card>
        <Text style={[styles.intro, { color: c.onSurfaceVariant }]}>
          Aktive Suchmeldungen werden nur nach Standortfreigabe in deiner Nähe geladen.
        </Text>
        <ActionButton
          title={locationReady ? 'Standort aktualisieren' : 'Standort verwenden'}
          variant="secondary"
          onPress={locate}
        />
        {locationError ? <ErrorBox message={locationError} /> : null}
      </Card>
      {!locationReady ? (
        <Card>
          <EmptyText>Aktiviere deinen Standort, um aktive Suchmeldungen zu sehen.</EmptyText>
        </Card>
      ) : reports.isPending ? (
        <LoadingView label="Suchmeldungen werden geladen …" />
      ) : reports.isError ? (
        <ErrorBox
          message={`Suchmeldungen konnten nicht geladen werden: ${reports.error.message}`}
          onRetry={() => void reports.refetch()}
        />
      ) : reports.data?.length ? (
        reports.data.map((report) => (
          <Card key={report.id}>
            <View style={styles.top}>
              <Text style={[styles.title, { color: c.onSurface }]}>
                {ownPetIds.has(report.pet_id) ? 'Deine Suchmeldung' : 'Vermisstes Tier'}
              </Text>
              <Text style={[styles.status, { color: c.error }]}>AKTIV</Text>
            </View>
            <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
              Letzte Sichtung: {new Date(report.last_seen_at).toLocaleString('de-DE')} · Suchradius{' '}
              {report.search_radius_km} km
            </Text>
            {report.description ? (
              <Text style={[styles.description, { color: c.onSurface }]}>{report.description}</Text>
            ) : null}
            <Pressable onPress={() => router.push('/missing')}>
              <Text style={[styles.hint, { color: c.primary }]}>Sichtung melden →</Text>
            </Pressable>
          </Card>
        ))
      ) : (
        <Card>
          <EmptyText>Keine aktiven Suchmeldungen in deiner Nähe.</EmptyText>
        </Card>
      )}
      <Pressable onPress={() => router.replace('/missing')}>
        <Text style={[styles.back, { color: c.primary }]}>← Eigene Suchmeldungen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: appFonts.extrabold, fontSize: 17 },
  status: { fontFamily: appFonts.bold, fontSize: 11 },
  meta: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 8 },
  description: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 20, marginTop: 12 },
  hint: { fontFamily: appFonts.bold, fontSize: 13, marginTop: 14 },
  back: { textAlign: 'center', fontFamily: appFonts.bold, padding: 16 },
});
