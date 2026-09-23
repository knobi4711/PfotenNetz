import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useNearbyHelpers, type NearbyHelper } from '@pfotennetz/supabase';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  usePalette,
} from '../../components/ui';
import { formatAvailableDays, projectNearbyPoint, type MapCoordinate } from '../../lib/helper-map';

const RADII = [1.5, 3, 5, 10] as const;

function trustLabel(trustLevel: string): string {
  if (trustLevel === 'gold') return 'Gold-verifiziert';
  if (trustLevel === 'silver') return 'Silber-verifiziert';
  return trustLevel;
}

function helperInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '🐾';
}

function KiezMap({
  center,
  radiusKm,
  helpers,
  selectedId,
  onSelect,
}: {
  center: MapCoordinate;
  radiusKm: number;
  helpers: NearbyHelper[];
  selectedId: string | null;
  onSelect: (helperId: string) => void;
}) {
  const c = usePalette();
  return (
    <View
      accessibilityLabel={`Kiez-Kartenübersicht mit ${helpers.length} Helferinnen und Helfern`}
      style={[
        styles.map,
        { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
      ]}
    >
      <View style={[styles.mapGridHorizontal, { borderColor: c.outlineVariant }]} />
      <View style={[styles.mapGridVertical, { borderColor: c.outlineVariant }]} />
      <View style={[styles.radiusCircle, { borderColor: c.primary }]} />
      <View style={[styles.userMarker, { backgroundColor: c.secondary, borderColor: c.surface }]}>
        <Text style={[styles.userMarkerText, { color: c.onSecondary }]}>Du</Text>
      </View>
      {helpers.map((helper) => {
        const point = projectNearbyPoint(
          center,
          { latitude: helper.latitude, longitude: helper.longitude },
          radiusKm
        );
        const selected = helper.helper_id === selectedId;
        return (
          <Pressable
            key={helper.helper_id}
            accessibilityRole="button"
            accessibilityLabel={`${helper.display_name}, ${Number(helper.distance_km).toLocaleString('de-DE')} Kilometer entfernt`}
            accessibilityState={{ selected }}
            onPress={() => {
              onSelect(helper.helper_id);
            }}
            style={[
              styles.helperMarker,
              {
                left: `${point.x}%`,
                top: `${point.y}%`,
                backgroundColor: selected ? c.tertiary : c.primary,
                borderColor: c.surface,
              },
            ]}
          >
            <Text
              style={[styles.helperMarkerText, { color: selected ? c.onTertiary : c.onPrimary }]}
            >
              {helperInitial(helper.display_name)}
            </Text>
          </Pressable>
        );
      })}
      <Text style={[styles.north, { color: c.onSurfaceVariant }]}>N</Text>
      <Text style={[styles.mapCaption, { color: c.onSurfaceVariant }]}>ca. ±{radiusKm} km</Text>
    </View>
  );
}

function HelperCard({
  helper,
  selected,
  onSelect,
  onOpenDetail,
  onRequest,
}: {
  helper: NearbyHelper;
  selected: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
  onRequest: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onSelect}>
      <Card>
        <View style={styles.helperHeader}>
          <View style={[styles.avatar, { backgroundColor: c.surfaceContainerHigh }]}>
            <Text style={[styles.avatarText, { color: c.primary }]}>
              {helperInitial(helper.display_name)}
            </Text>
          </View>
          <View style={styles.helperMain}>
            <Text style={[styles.helperName, { color: c.onSurface }]}>{helper.display_name}</Text>
            <Text style={[styles.helperTrust, { color: c.onSurfaceVariant }]}>
              {trustLabel(helper.trust_level)}
            </Text>
          </View>
          <Text style={[styles.distance, { color: c.primary }]}>
            {Number(helper.distance_km).toLocaleString('de-DE')} km
          </Text>
        </View>
        <InfoRow
          label="Bewertung"
          value={
            Number(helper.rating) > 0 ? `${Number(helper.rating).toFixed(1)} / 5` : 'Noch keine'
          }
        />
        <InfoRow label="Regelmäßig verfügbar" value={formatAvailableDays(helper.available_days)} />
        <InfoRow label="Abgeschlossene Einsätze" value={String(helper.total_walks)} />
        {selected ? (
          <View style={styles.cardActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${helper.display_name} im Detail ansehen`}
              onPress={onOpenDetail}
              style={[styles.cardButton, { backgroundColor: c.surfaceContainerHigh }]}
            >
              <Text style={[styles.cardButtonText, { color: c.onSurface }]}>Detail ansehen</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${helper.display_name} für Betreuung anfragen`}
              onPress={onRequest}
              style={[styles.cardButton, { backgroundColor: c.primary }]}
            >
              <Text style={[styles.cardButtonText, { color: c.onPrimary }]}>
                Betreuung anfragen
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const c = usePalette();
  const [center, setCenter] = useState<MapCoordinate | null>(null);
  const [radiusKm, setRadiusKm] = useState<(typeof RADII)[number]>(3);
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const helpersQuery = useNearbyHelpers(center === null ? null : { ...center, radiusKm });
  const helpers = helpersQuery.data ?? [];

  const locate = () => {
    setLocationPending(true);
    setLocationError(null);
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setLocationError('Standortfreigabe wurde nicht erteilt.');
          return;
        }
        const cached = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 1000,
        });
        const position =
          cached ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setSelectedId(null);
      } catch (error: unknown) {
        setLocationError(
          error instanceof Error ? error.message : 'Standort konnte nicht bestimmt werden.'
        );
      } finally {
        setLocationPending(false);
      }
    })();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.onSurface }]}>Helfer:innen im Kiez</Text>
        <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>
          Finde verifizierte Helfer:innen in deiner Nähe. Die Karte zeigt aus Datenschutzgründen nur
          ungefähre Positionen.
        </Text>

        <Card>
          <SectionTitle>Suchradius</SectionTitle>
          <View style={styles.radiusRow}>
            {RADII.map((radius) => {
              const selected = radius === radiusKm;
              return (
                <Pressable
                  key={radius}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setRadiusKm(radius);
                    setSelectedId(null);
                  }}
                  style={[
                    styles.radiusChip,
                    { backgroundColor: selected ? c.primary : c.surfaceContainerHigh },
                  ]}
                >
                  <Text
                    style={[styles.radiusText, { color: selected ? c.onPrimary : c.onSurface }]}
                  >
                    {radius.toString().replace('.', ',')} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ActionButton
            title={center === null ? 'Standort verwenden' : 'Standort aktualisieren'}
            pending={locationPending}
            onPress={locate}
          />
          {locationError !== null ? <ErrorBox message={locationError} /> : null}
        </Card>

        {center === null ? (
          <Card>
            <EmptyText>
              Aktiviere deinen Standort, um Helfer:innen in deinem Kiez zu suchen.
            </EmptyText>
          </Card>
        ) : helpersQuery.isPending ? (
          <LoadingView label="Helfer:innen werden gesucht …" />
        ) : helpersQuery.isError ? (
          <ErrorBox
            message={`Suche fehlgeschlagen: ${helpersQuery.error.message}`}
            onRetry={() => {
              void helpersQuery.refetch();
            }}
          />
        ) : (
          <>
            <KiezMap
              center={center}
              radiusKm={radiusKm}
              helpers={helpers}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <Text style={[styles.resultCount, { color: c.onSurfaceVariant }]}>
              {helpers.length === 1
                ? '1 Helfer:in gefunden'
                : `${helpers.length} Helfer:innen gefunden`}
            </Text>
            {helpers.length === 0 ? (
              <Card>
                <EmptyText>
                  In diesem Radius wurden keine verifizierten Helfer:innen gefunden. Vergrößere den
                  Suchradius und versuche es erneut.
                </EmptyText>
              </Card>
            ) : (
              helpers.map((helper) => (
                <HelperCard
                  key={helper.helper_id}
                  helper={helper}
                  selected={selectedId === helper.helper_id}
                  onSelect={() => {
                    setSelectedId(helper.helper_id);
                  }}
                  onOpenDetail={() => {
                    router.push({ pathname: '/helper/[id]', params: { id: helper.helper_id } });
                  }}
                  onRequest={() => {
                    router.push({
                      pathname: '/booking/new',
                      params: { helperId: helper.helper_id },
                    });
                  }}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radiusChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  radiusText: { fontSize: 14, fontWeight: '700' },
  map: {
    height: 280,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mapGridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    borderTopWidth: 1,
  },
  mapGridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    borderLeftWidth: 1,
  },
  radiusCircle: {
    position: 'absolute',
    left: '5%',
    top: '5%',
    width: '90%',
    height: '90%',
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.45,
  },
  userMarker: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 42,
    height: 42,
    marginLeft: -21,
    marginTop: -21,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerText: { fontSize: 11, fontWeight: '800' },
  helperMarker: {
    position: 'absolute',
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    borderRadius: 19,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperMarkerText: { fontSize: 16, fontWeight: '800' },
  north: { position: 'absolute', right: 12, top: 10, fontSize: 13, fontWeight: '800' },
  mapCaption: { position: 'absolute', right: 10, bottom: 8, fontSize: 11 },
  resultCount: { fontSize: 13, marginBottom: 10 },
  helperHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  helperMain: { flex: 1 },
  helperName: { fontSize: 16, fontWeight: '800' },
  helperTrust: { fontSize: 12, marginTop: 2 },
  distance: { fontSize: 14, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cardButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardButtonText: { fontSize: 14, fontWeight: '800' },
});
