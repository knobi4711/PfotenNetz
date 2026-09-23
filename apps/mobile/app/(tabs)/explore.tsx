import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useNearbyHelpers, type NearbyHelper } from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  Card,
  Chip,
  ChipRow,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  appFonts,
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

function NeighborhoodMap({
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
      accessibilityLabel={`Kartenübersicht der Nachbarschaft mit ${helpers.length} Helferinnen und Helfern`}
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
        <AppHeader
          title="Helfer:innen in der Nachbarschaft"
          subtitle="Verifizierte Unterstützung direkt in deiner Nähe."
          onNotifications={() => {
            router.push('/(tabs)/tracking');
          }}
        />

        <View style={styles.filterSection}>
          <ChipRow>
            {RADII.map((radius) => {
              const selected = radius === radiusKm;
              return (
                <Chip
                  key={radius}
                  label={`${radius.toString().replace('.', ',')} km`}
                  selected={selected}
                  icon="map-marker-radius"
                  onPress={() => {
                    setRadiusKm(radius);
                    setSelectedId(null);
                  }}
                />
              );
            })}
          </ChipRow>
          <ActionButton
            title={center === null ? 'Standort verwenden' : 'Standort aktualisieren'}
            pending={locationPending}
            onPress={locate}
          />
          {locationError !== null ? <ErrorBox message={locationError} /> : null}
        </View>

        {center === null ? (
          <Card>
            <EmptyText>
              Aktiviere deinen Standort, um Helfer:innen in deiner Nachbarschaft zu suchen.
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
            <NeighborhoodMap
              center={center}
              radiusKm={radiusKm}
              helpers={helpers}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <View style={styles.resultHeading}>
              <SectionTitle>In deiner Nähe</SectionTitle>
              <Text style={[styles.resultCount, { color: c.secondary }]}>
                {helpers.length === 1 ? '1 Treffer' : `${helpers.length} Treffer`}
              </Text>
            </View>
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
  content: { padding: 16, paddingBottom: 40 },
  filterSection: { marginBottom: 16 },
  map: {
    height: 280,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
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
  userMarkerText: { fontFamily: appFonts.extrabold, fontSize: 11 },
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
  helperMarkerText: { fontFamily: appFonts.extrabold, fontSize: 16 },
  north: {
    position: 'absolute',
    right: 12,
    top: 10,
    fontFamily: appFonts.extrabold,
    fontSize: 13,
  },
  mapCaption: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    fontFamily: appFonts.regular,
    fontSize: 11,
  },
  resultHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultCount: { fontFamily: appFonts.bold, fontSize: 12, marginBottom: 12 },
  helperHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: appFonts.extrabold, fontSize: 18 },
  helperMain: { flex: 1 },
  helperName: { fontFamily: appFonts.bold, fontSize: 16, lineHeight: 22 },
  helperTrust: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
  distance: { fontFamily: appFonts.extrabold, fontSize: 13 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cardButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardButtonText: { fontFamily: appFonts.bold, fontSize: 13 },
});
