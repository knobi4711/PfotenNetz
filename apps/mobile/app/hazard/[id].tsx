import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import {
  createHazardPhotoUrl,
  HAZARD_SEVERITY_LABELS,
  HAZARD_TYPE_LABELS,
  useCreateHazardSighting,
  useHazard,
} from '@pfotennetz/supabase';
import { getSupabaseClient } from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  Card,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';

export default function HazardDetailScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hazardQuery = useHazard(typeof id === 'string' ? id : null);
  const sighting = useCreateHazardSighting();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const hazard = hazardQuery.data ?? null;

  const sendFeedback = (description: string) => {
    setFeedbackError(null);
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) throw new Error('Standortfreigabe wurde nicht erteilt.');
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (hazard === null) return;
        sighting.mutate({
          hazardId: hazard.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          description,
        });
      } catch (error: unknown) {
        setFeedbackError(
          error instanceof Error ? error.message : 'Standort konnte nicht bestimmt werden.'
        );
      }
    })();
  };

  if (hazardQuery.isPending) return <LoadingView label="Gefahr wird geladen …" />;
  if (hazardQuery.isError)
    return (
      <View style={styles.container}>
        <ErrorBox
          message={`Gefahr konnte nicht geladen werden: ${hazardQuery.error.message}`}
          onRetry={() => void hazardQuery.refetch()}
        />
      </View>
    );
  if (hazard === null) return null;

  const loadPhoto = async (path: string) => {
    const url = await createHazardPhotoUrl(getSupabaseClient(), path);
    setPhotoUrl(url);
    setPhotoVisible(url !== null);
  };
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Gefahrendetails" subtitle="Gemeinsam aufmerksam bleiben." />
      <Card>
        <SectionTitle>{HAZARD_TYPE_LABELS[hazard.type]}</SectionTitle>
        <View
          style={[
            styles.status,
            {
              backgroundColor:
                hazard.severity === 'critical' || hazard.severity === 'high' ? c.error : c.primary,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: c.onPrimary }]}>
            {HAZARD_SEVERITY_LABELS[hazard.severity]}
          </Text>
        </View>
        <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
          {hazard.address ?? 'Standort in deiner Nachbarschaft'} · Warnradius {hazard.radius_km} km
        </Text>
        {hazard.description ? (
          <Text style={[styles.body, { color: c.onSurface }]}>{hazard.description}</Text>
        ) : null}
        {hazard.photos.map((path) => (
          <Pressable key={path} onPress={() => void loadPhoto(path)}>
            <Text style={[styles.photoLink, { color: c.primary }]}>Foto anzeigen →</Text>
          </Pressable>
        ))}
      </Card>
      <Card>
        <SectionTitle>Was ist vor Ort?</SectionTitle>
        <Text style={[styles.body, { color: c.onSurfaceVariant }]}>
          Melde zurück, ob die Gefahr noch besteht oder der Bereich gesäubert wurde. Deine
          Rückmeldung hilft der Nachbarschaft.
        </Text>
        <ActionButton
          title="Bereich gesäubert"
          variant="secondary"
          pending={sighting.isPending}
          onPress={() => sendFeedback('Bereich gesäubert')}
        />
        <ActionButton
          title="Gefahr besteht weiterhin"
          pending={sighting.isPending}
          onPress={() => sendFeedback('Gefahr besteht weiterhin')}
        />
        {sighting.isSuccess ? (
          <Text style={[styles.success, { color: c.secondary }]}>
            Danke, deine Rückmeldung wurde gespeichert.
          </Text>
        ) : null}
        {sighting.isError ? (
          <ErrorBox message={`Rückmeldung fehlgeschlagen: ${sighting.error.message}`} />
        ) : null}
        {feedbackError ? <ErrorBox message={feedbackError} /> : null}
      </Card>
      <Modal transparent visible={photoVisible} onRequestClose={() => setPhotoVisible(false)}>
        <Pressable style={styles.modal} onPress={() => setPhotoVisible(false)}>
          {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.image} /> : null}
        </Pressable>
      </Modal>
      <ActionButton
        title="Zurück zum Gefahrenradar"
        variant="secondary"
        onPress={() => router.replace('/hazard/radar')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { paddingBottom: 40 },
  status: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontFamily: appFonts.bold, fontSize: 12 },
  meta: { fontFamily: appFonts.regular, fontSize: 13, marginTop: 12 },
  body: { fontFamily: appFonts.regular, fontSize: 15, lineHeight: 22, marginTop: 14 },
  photoLink: { fontFamily: appFonts.semibold, marginTop: 12 },
  success: { fontFamily: appFonts.semibold, marginTop: 12 },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  image: { width: '100%', aspectRatio: 1, borderRadius: 20 },
});
