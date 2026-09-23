import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import {
  useCreateMissingPet,
  useMarkMissingPetFound,
  useOwnMissingPets,
  useOwnPets,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../components/ui';

export default function MissingPetsScreen() {
  const c = usePalette();
  const pets = useOwnPets();
  const reports = useOwnMissingPets();
  const create = useCreateMissingPet();
  const markFound = useMarkMissingPetFound();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reportMissing = () => {
    setError(null);
    void (async () => {
      try {
        if (!selectedPetId) throw new Error('Bitte wähle zuerst ein Tier aus.');
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) throw new Error('Standortfreigabe wurde nicht erteilt.');
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await create.mutateAsync({
          petId: selectedPetId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          description,
          lastSeenAt: new Date().toISOString(),
          radiusKm: 3,
        });
        setDescription('');
        setSelectedPetId(null);
      } catch (cause: unknown) {
        setError(
          cause instanceof Error ? cause.message : 'Meldung konnte nicht gespeichert werden.'
        );
      }
    })();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Vermisstes Tier" subtitle="Schnelle Hilfe aus der Nachbarschaft." />
      <ActionButton
        title="Vermissten-Radar öffnen"
        variant="secondary"
        onPress={() => router.push('/missing/radar')}
      />
      <Card>
        <SectionTitle>Vermisst melden</SectionTitle>
        <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
          Wähle dein Tier und gib den letzten bekannten Ort über deinen aktuellen Standort an.
        </Text>
        {pets.isPending ? (
          <LoadingView label="Tiere werden geladen …" />
        ) : pets.data?.length ? (
          <View style={styles.petChoices}>
            {pets.data
              .filter((pet) => !pet.is_deceased)
              .map((pet) => (
                <Pressable
                  key={pet.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedPetId === pet.id }}
                  onPress={() => setSelectedPetId(pet.id)}
                  style={[
                    styles.petChoice,
                    {
                      borderColor: selectedPetId === pet.id ? c.primary : c.outlineVariant,
                      backgroundColor:
                        selectedPetId === pet.id ? c.primaryFixed : c.surfaceContainerLow,
                    },
                  ]}
                >
                  <Text style={styles.petEmoji}>{pet.species === 'cat' ? '🐱' : '🐶'}</Text>
                  <Text style={[styles.petName, { color: c.onSurface }]}>{pet.name}</Text>
                </Pressable>
              ))}
          </View>
        ) : (
          <EmptyText>Lege zuerst ein Tierprofil an.</EmptyText>
        )}
        <TextInput
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Besondere Merkmale, letzte Sichtung …"
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
          title="Als vermisst melden"
          pending={create.isPending}
          onPress={reportMissing}
        />
        {error ? <ErrorBox message={error} /> : null}
      </Card>
      <Card>
        <SectionTitle>Meine Suchmeldungen</SectionTitle>
        {reports.isPending ? (
          <LoadingView label="Meldungen werden geladen …" />
        ) : reports.data?.length ? (
          reports.data.map((report) => {
            const pet = pets.data?.find((item) => item.id === report.pet_id);
            return (
              <View key={report.id} style={styles.reportRow}>
                <View style={styles.reportMain}>
                  <Text style={[styles.reportName, { color: c.onSurface }]}>
                    {pet?.name ?? 'Tier'}
                  </Text>
                  <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
                    {report.status === 'active'
                      ? 'Aktive Suchmeldung'
                      : report.status === 'found'
                        ? 'Gefunden'
                        : 'Beendet'}{' '}
                    · Radius {report.search_radius_km} km
                  </Text>
                </View>
                {report.status === 'active' ? (
                  <ActionButton
                    title="Gefunden"
                    variant="secondary"
                    pending={markFound.isPending}
                    onPress={() => markFound.mutate(report.id)}
                  />
                ) : null}
              </View>
            );
          })
        ) : (
          <EmptyText>Noch keine Suchmeldungen.</EmptyText>
        )}
      </Card>
      <Pressable onPress={() => router.replace('/(tabs)/home')}>
        <Text style={[styles.back, { color: c.primary }]}>← Zur Übersicht</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hint: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 19 },
  petChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  petChoice: { alignItems: 'center', borderWidth: 2, borderRadius: 16, minWidth: 92, padding: 12 },
  petEmoji: { fontSize: 30 },
  petName: { fontFamily: appFonts.bold, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 100,
    padding: 14,
    marginTop: 16,
    textAlignVertical: 'top',
    fontFamily: appFonts.regular,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#dec0b744',
    paddingVertical: 12,
  },
  reportMain: { flex: 1 },
  reportName: { fontFamily: appFonts.bold, fontSize: 16 },
  back: { textAlign: 'center', fontFamily: appFonts.bold, padding: 16 },
});
