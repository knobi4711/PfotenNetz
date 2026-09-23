import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import {
  useCreateHazard,
  useUploadHazardPhoto,
  HAZARD_SEVERITY_LABELS,
  HAZARD_TYPE_LABELS,
  type HazardSeverity,
  type HazardType,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  Card,
  Chip,
  ChipRow,
  ErrorBox,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';

const TYPES: HazardType[] = [
  'poison_bait',
  'glass_shards',
  'aggressive_dog',
  'wasp_nest',
  'trap',
  'other',
];
const SEVERITIES: HazardSeverity[] = ['low', 'medium', 'high', 'critical'];

export default function HazardReportScreen() {
  const c = usePalette();
  const create = useCreateHazard();
  const upload = useUploadHazardPhoto();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<HazardType>('poison_bait');
  const [severity, setSeverity] = useState<HazardSeverity>('medium');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<{ fileData: ArrayBuffer; contentType: string } | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locate = async (): Promise<{ latitude: number; longitude: number }> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Standortfreigabe wurde nicht erteilt.');
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
    setLocation(point);
    const places = await Location.reverseGeocodeAsync(point);
    const place = places[0];
    if (place)
      setAddress(
        place.formattedAddress ??
          [place.street, place.streetNumber, place.city].filter(Boolean).join(', ')
      );
    return point;
  };

  const selectPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Zugriff auf Fotos wurde nicht erteilt.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
      exif: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhoto({
      fileData: await new File(asset.uri).arrayBuffer(),
      contentType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const publish = async () => {
    setError(null);
    try {
      const point = location ?? (await locate());
      const hazard = await create.mutateAsync({
        type,
        severity,
        latitude: point.latitude,
        longitude: point.longitude,
        radiusKm: severity === 'critical' ? 1.5 : 0.5,
        address: address.trim() || null,
        description,
      });
      if (photo)
        await upload.mutateAsync({
          hazardId: hazard.id,
          fileData: photo.fileData,
          contentType: photo.contentType,
        });
      router.replace({
        pathname: '/hazard/success',
        params: { hazardNumber: hazard.hazard_number },
      });
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'Gefahr konnte nicht veröffentlicht werden.'
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Gefahr melden" subtitle={`Schritt ${step} von 3`} />
      <View style={styles.progress}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: c.primary, width: `${(step / 3) * 100}%` },
          ]}
        />
      </View>
      {step === 1 ? (
        <Card>
          <SectionTitle>Art und Ort</SectionTitle>
          <Text style={[styles.label, { color: c.onSurface }]}>Welche Gefahr wurde entdeckt?</Text>
          <ChipRow>
            {TYPES.map((item) => (
              <Chip
                key={item}
                label={HAZARD_TYPE_LABELS[item]}
                selected={type === item}
                onPress={() => setType(item)}
              />
            ))}
          </ChipRow>
          <ActionButton
            title={location ? 'Fundort aktualisiert' : 'Aktuellen Fundort verwenden'}
            variant="secondary"
            onPress={() =>
              void locate().catch((cause: unknown) =>
                setError(
                  cause instanceof Error ? cause.message : 'Standort konnte nicht bestimmt werden.'
                )
              )
            }
          />
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Adresse oder Ort (optional)"
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
        </Card>
      ) : null}
      {step === 2 ? (
        <Card>
          <SectionTitle>Details und Foto</SectionTitle>
          <Text style={[styles.label, { color: c.onSurface }]}>Dringlichkeit</Text>
          <ChipRow>
            {SEVERITIES.map((item) => (
              <Chip
                key={item}
                label={HAZARD_SEVERITY_LABELS[item]}
                selected={severity === item}
                onPress={() => setSeverity(item)}
              />
            ))}
          </ChipRow>
          <Text style={[styles.label, { color: c.onSurface }]}>Was ist passiert?</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Beschreibe Fundort und Gefahr …"
            placeholderTextColor={c.outline}
            style={[
              styles.textarea,
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
            onPress={() =>
              void selectPhoto().catch((cause: unknown) =>
                setError(
                  cause instanceof Error ? cause.message : 'Foto konnte nicht ausgewählt werden.'
                )
              )
            }
          />
        </Card>
      ) : null}
      {step === 3 ? (
        <Card>
          <SectionTitle>Prüfen und veröffentlichen</SectionTitle>
          <Text style={[styles.summaryTitle, { color: c.onSurface }]}>
            {HAZARD_TYPE_LABELS[type]}
          </Text>
          <Text style={[styles.summary, { color: c.onSurfaceVariant }]}>
            {HAZARD_SEVERITY_LABELS[severity]} · Warnradius{' '}
            {severity === 'critical' ? '1,5 km' : '500 m'}
          </Text>
          <Text style={[styles.summary, { color: c.onSurfaceVariant }]}>
            {address || 'Standort wird verwendet'}
          </Text>
          <Text style={[styles.summary, { color: c.onSurfaceVariant }]}>
            {description || 'Keine weiteren Details angegeben.'}
          </Text>
          <Text style={[styles.notice, { color: c.onSurfaceVariant }]}>
            Die Meldung wird zunächst geprüft und anschließend an Menschen in der Nähe
            weitergegeben.
          </Text>
        </Card>
      ) : null}
      {error ? <ErrorBox message={error} /> : null}
      <View style={styles.navigation}>
        {step > 1 ? (
          <Pressable onPress={() => setStep((current) => current - 1)}>
            <Text style={[styles.back, { color: c.primary }]}>Zurück</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {step < 3 ? (
          <ActionButton
            title="Weiter"
            onPress={() => {
              if (step === 1 && location === null) {
                setError('Bitte bestimme den Fundort.');
                return;
              }
              setError(null);
              setStep((current) => current + 1);
            }}
          />
        ) : (
          <ActionButton
            title="Gefahr veröffentlichen"
            pending={create.isPending || upload.isPending}
            onPress={() => void publish()}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  progress: {
    height: 6,
    borderRadius: 99,
    backgroundColor: '#dec0b7',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: { height: '100%' },
  label: { fontFamily: appFonts.semibold, fontSize: 13, marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    marginTop: 12,
    fontFamily: appFonts.regular,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 130,
    padding: 14,
    textAlignVertical: 'top',
    fontFamily: appFonts.regular,
  },
  summaryTitle: { fontFamily: appFonts.bold, fontSize: 20, marginBottom: 8 },
  summary: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 22 },
  notice: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 16 },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
  },
  back: { fontFamily: appFonts.bold, padding: 14 },
});
