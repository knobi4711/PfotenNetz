import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import {
  useCreateMissingPetSighting,
  useMissingPetSightings,
  useNearbyMissingPets,
  useOwnPets,
  useUploadMissingPetSightingPhoto,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  BackButton,
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
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<{ fileData: ArrayBuffer; contentType: string } | null>(null);
  const createSighting = useCreateMissingPetSighting();
  const uploadPhoto = useUploadMissingPetSightingPhoto();
  const sightings = useMissingPetSightings(selectedReportId ?? undefined);
  const locate = () => {
    setLocationError(null);
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Standortfreigabe wurde nicht erteilt.');
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      setLocationReady(true);
    })().catch((cause: unknown) =>
      setLocationError(
        cause instanceof Error ? cause.message : 'Standort konnte nicht bestimmt werden.'
      )
    );
  };
  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Zugriff auf Fotos wurde nicht erteilt.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({
        fileData: await new File(asset.uri).arrayBuffer(),
        contentType: asset.mimeType ?? 'image/jpeg',
      });
    }
  };
  const submitSighting = async () => {
    if (!selectedReportId || !location) return;
    try {
      const sighting = await createSighting.mutateAsync({
        missingPetId: selectedReportId,
        latitude: location.latitude,
        longitude: location.longitude,
        description,
        seenAt: new Date().toISOString(),
      });
      if (photo) await uploadPhoto.mutateAsync({ sightingId: sighting.id, ...photo });
      setSelectedReportId(null);
      setDescription('');
      setPhoto(null);
    } catch {
      // The mutation error is shown in the form.
    }
  };
  const ownPetIds = new Set((pets.data ?? []).map((pet) => pet.id));
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Vermissten-Radar" subtitle="Hilf Tieren in deiner Nachbarschaft." />
      <BackButton onPress={() => router.back()} />
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
            <Pressable onPress={() => setSelectedReportId(report.id)}>
              <Text style={[styles.hint, { color: c.primary }]}>Sichtung melden →</Text>
            </Pressable>
          </Card>
        ))
      ) : (
        <Card>
          <EmptyText>Keine aktiven Suchmeldungen in deiner Nähe.</EmptyText>
        </Card>
      )}
      {selectedReportId ? (
        <Card>
          <Text style={[styles.title, { color: c.onSurface }]}>Sichtung melden</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Wo und wann hast du das Tier gesehen?"
            placeholderTextColor={c.outline}
            style={[
              styles.input,
              {
                color: c.onSurface,
                borderColor: c.outlineVariant,
                backgroundColor: c.surfaceContainerLow,
              },
            ]}
          />
          <ActionButton
            title={photo ? 'Foto ausgewählt' : 'Foto hinzufügen'}
            variant="secondary"
            onPress={() => void choosePhoto()}
          />
          <ActionButton
            title="Sichtung speichern"
            pending={createSighting.isPending || uploadPhoto.isPending}
            disabled={location === null}
            onPress={() => void submitSighting()}
          />
          {createSighting.isError || uploadPhoto.isError ? (
            <ErrorBox message="Sichtung konnte nicht gespeichert werden." />
          ) : null}
        </Card>
      ) : null}
      {selectedReportId ? (
        <Card>
          <Text style={[styles.title, { color: c.onSurface }]}>Bisherige Sichtungen</Text>
          {sightings.isPending ? (
            <LoadingView label="Sichtungen werden geladen …" />
          ) : sightings.isError ? (
            <ErrorBox
              message={`Sichtungen konnten nicht geladen werden: ${sightings.error.message}`}
            />
          ) : sightings.data?.length ? (
            sightings.data.map((sighting) => (
              <View key={sighting.id} style={styles.sightingRow}>
                <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
                  {new Date(sighting.seen_at).toLocaleString('de-DE')}
                </Text>
                {sighting.description ? (
                  <Text style={[styles.description, { color: c.onSurface }]}>
                    {sighting.description}
                  </Text>
                ) : null}
                {sighting.photoUrls.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoGallery}
                  >
                    {sighting.photoUrls.map((photoUrl) => (
                      <Image
                        key={photoUrl}
                        source={{ uri: photoUrl }}
                        style={styles.sightingPhoto}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            ))
          ) : (
            <EmptyText>Noch keine Sichtungen gemeldet.</EmptyText>
          )}
        </Card>
      ) : null}
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
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 90,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
    textAlignVertical: 'top',
    fontFamily: appFonts.regular,
  },
  sightingRow: { borderTopWidth: 1, borderTopColor: '#dec0b744', paddingVertical: 12 },
  sightingPhoto: { width: 120, height: 90, borderRadius: 12, marginTop: 8 },
  photoGallery: { marginTop: 4 },
  hint: { fontFamily: appFonts.bold, fontSize: 13, marginTop: 14 },
  back: { textAlign: 'center', fontFamily: appFonts.bold, padding: 16 },
});
