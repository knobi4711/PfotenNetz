import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { bookingTypeLabels } from '../../lib/booking';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  BOOKING_TYPES,
  nearbyHelperErrorMessage,
  useHelperSearchOrigin,
  useNearbyHelpers,
  useOwnPets,
  type NearbyHelper,
  type BookingType,
} from '@pfotennetz/supabase';
import { MAX_HELPER_DISTANCE_KM, petHomeLabel } from '@pfotennetz/shared';
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

const SPECIES = [
  ['dog', 'Hund'],
  ['cat', 'Katze'],
  ['rabbit', 'Kaninchen'],
  ['guinea_pig', 'Meerschweinchen'],
  ['bird', 'Vogel'],
  ['horse', 'Pferd'],
  ['amphibian', 'Amphibie'],
  ['fish', 'Fisch'],
  ['other', 'Andere'],
] as const;
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

function trustLabel(trustLevel: string): string {
  if (trustLevel === 'gold') return 'Gold-verifiziert';
  if (trustLevel === 'silver') return 'Silber-verifiziert';
  return trustLevel;
}

function helperInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '🐾';
}

/** Zoom that keeps every visible helper on screen without a search radius. */
function zoomForHelpers(helpers: NearbyHelper[]): number {
  const maxDistanceKm = helpers.reduce(
    (max, helper) => Math.max(max, Number(helper.distance_km) || 0),
    0
  );
  if (maxDistanceKm <= 0) return 14;
  return Math.max(10, Math.min(15, Math.round(15 - Math.log2(Math.max(maxDistanceKm, 0.5)))));
}

/** Radius used only to project helper coordinates onto the schematic web map. */
function projectionRadiusKm(helpers: NearbyHelper[]): number {
  const maxDistanceKm = helpers.reduce(
    (max, helper) => Math.max(max, Number(helper.distance_km) || 0),
    0
  );
  return Math.max(0.5, maxDistanceKm * 1.15);
}

function osmMapHtml(center: MapCoordinate, helpers: NearbyHelper[], centerLabel: string): string {
  const markers = helpers.map((helper) => ({
    id: helper.helper_id,
    name: helper.display_name,
    latitude: helper.latitude,
    longitude: helper.longitude,
    distance: `${Number(helper.distance_km).toLocaleString('de-DE')} km entfernt`,
  }));
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>html,body,#map{height:100%;margin:0;background:#f4f0ed}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const center=[${center.latitude},${center.longitude}];const map=L.map('map').setView(center,${zoomForHelpers(helpers)});L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap-Mitwirkende'}).addTo(map);L.marker(center).addTo(map).bindPopup(${JSON.stringify(`Dein ${centerLabel}`)});${JSON.stringify(markers)}.forEach(h=>L.marker([h.latitude,h.longitude]).addTo(map).bindPopup('<strong>'+h.name+'</strong><br>'+h.distance).on('click',()=>window.ReactNativeWebView.postMessage(h.id)));</script></body></html>`;
}

function NeighborhoodMap({
  center,
  helpers,
  centerLabel,
  selectedId,
  onSelect,
}: {
  center: MapCoordinate;
  helpers: NearbyHelper[];
  centerLabel: string;
  selectedId: string | null;
  onSelect: (helperId: string) => void;
}) {
  const c = usePalette();
  if (Platform.OS !== 'web') {
    const handleMapMessage = (event: WebViewMessageEvent) => onSelect(event.nativeEvent.data);
    return (
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.map, { borderColor: c.outlineVariant }]}
      >
        <WebView
          javaScriptEnabled
          onMessage={handleMapMessage}
          originWhitelist={['*']}
          source={{ html: osmMapHtml(center, helpers, centerLabel) }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
  const radiusKm = projectionRadiusKm(helpers);
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.map,
        { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
      ]}
    >
      <View style={[styles.mapGridHorizontal, { borderColor: c.outlineVariant }]} />
      <View style={[styles.mapGridVertical, { borderColor: c.outlineVariant }]} />
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
      <Text style={[styles.mapCaption, { color: c.onSurfaceVariant }]}>{centerLabel}</Text>
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
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${helper.display_name}, ${Number(helper.distance_km).toLocaleString('de-DE')} Kilometer entfernt`}
        accessibilityHint="Doppeltippen, um Details und die Anfrage-Aktionen anzuzeigen"
        onPress={onSelect}
      >
        <View style={styles.helperHeader}>
          <View style={[styles.avatar, { backgroundColor: c.surfaceContainerHigh }]}>
            <Text style={[styles.avatarText, { color: c.onSurfaceVariant }]}>
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
      </Pressable>
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
            <Text style={[styles.cardButtonText, { color: c.onPrimary }]}>Betreuung anfragen</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

export default function ExploreScreen() {
  const c = usePalette();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType | null>(null);
  const [petSpecies, setPetSpecies] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const originQuery = useHelperSearchOrigin();
  const petsQuery = useOwnPets();
  const homeLabel = petHomeLabel(petsQuery.data ?? []);
  const center = originQuery.data ?? null;
  const helpersQuery = useNearbyHelpers(
    center === null
      ? null
      : {
          ...center,
          radiusKm: MAX_HELPER_DISTANCE_KM,
          limit: 50,
          bookingType,
          petSpecies,
          dayOfWeek,
        }
  );
  const helpers = helpersQuery.data ?? [];

  const changeLocation = () => {
    router.push({ pathname: '/(tabs)/profile', params: { section: 'standort' } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Helfer:innen in der Nachbarschaft"
          subtitle={`Verifizierte Unterstützung rund um dein ${homeLabel}.`}
          onNotifications={() => {
            router.push('/(tabs)/tracking');
          }}
        />

        {originQuery.isPending ? (
          <LoadingView label={`${homeLabel} wird geladen …`} />
        ) : originQuery.isError ? (
          <ErrorBox
            message={`${homeLabel} konnte nicht geladen werden: ${nearbyHelperErrorMessage(originQuery.error)}`}
            onRetry={() => {
              void originQuery.refetch();
            }}
          />
        ) : center === null ? (
          <Card>
            <EmptyText>
              {`Für deine Suche fehlt noch dein ${homeLabel}. Lege es einmalig im Profil fest – danach zeigt die Karte sofort alle Helfer:innen, deren Reisebereitschaft dich erreicht.`}
            </EmptyText>
            <ActionButton title={`${homeLabel} festlegen`} onPress={changeLocation} />
          </Card>
        ) : (
          <>
            <View style={styles.filterSection}>
              <Text style={[styles.filterHint, { color: c.onSurfaceVariant }]}>
                {`Angezeigt werden Helfer:innen, deren eigene Reisebereitschaft dein ${homeLabel} erreicht. Ein zusätzlicher km-Radius ist nicht nötig.`}
              </Text>
              <Text style={[styles.filterLabel, { color: c.onSurface }]}>Betreuungsart</Text>
              <ChipRow>
                <Chip
                  label="Alle"
                  selected={bookingType === null}
                  onPress={() => setBookingType(null)}
                />
                {BOOKING_TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={bookingTypeLabels[type]}
                    selected={bookingType === type}
                    onPress={() => setBookingType(type)}
                  />
                ))}
              </ChipRow>
              <Text style={[styles.filterLabel, { color: c.onSurface }]}>Tierart</Text>
              <ChipRow>
                <Chip
                  label="Alle"
                  selected={petSpecies === null}
                  onPress={() => setPetSpecies(null)}
                />
                {SPECIES.map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    selected={petSpecies === value}
                    onPress={() => setPetSpecies(value)}
                  />
                ))}
              </ChipRow>
              <Text style={[styles.filterLabel, { color: c.onSurface }]}>Verfügbar am</Text>
              <ChipRow>
                <Chip
                  label="Jeder Tag"
                  selected={dayOfWeek === null}
                  onPress={() => setDayOfWeek(null)}
                />
                {DAYS.map((label, index) => (
                  <Chip
                    key={label}
                    label={label}
                    selected={dayOfWeek === index}
                    onPress={() => setDayOfWeek(index)}
                  />
                ))}
              </ChipRow>
              <ActionButton
                title={`${homeLabel} ändern`}
                variant="secondary"
                onPress={changeLocation}
              />
            </View>

            <Text style={[styles.mapHint, { color: c.onSurfaceVariant }]}>
              {helpers.length === 0
                ? 'Die Karte zeigt aktuell keine Helfer:innen in deiner Nähe.'
                : `Die Karte zeigt ${helpers.length === 1 ? 'eine Helferin bzw. einen Helfer' : `${helpers.length} Helfer:innen`} in deiner Nähe. Namen, Entfernung und Aktionen findest du in der Liste darunter.`}
            </Text>
            <NeighborhoodMap
              center={center}
              helpers={helpers}
              centerLabel={homeLabel}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {helpersQuery.isPending ? (
              <LoadingView label="Helfer:innen werden gesucht …" />
            ) : helpersQuery.isError ? (
              <ErrorBox
                message={`Suche fehlgeschlagen: ${nearbyHelperErrorMessage(helpersQuery.error)}`}
                onRetry={() => {
                  void helpersQuery.refetch();
                }}
              />
            ) : (
              <>
                <View style={styles.resultHeading}>
                  <SectionTitle>{`Rund um dein ${homeLabel}`}</SectionTitle>
                  <Text style={[styles.resultCount, { color: c.secondary }]}>
                    {helpers.length === 1 ? '1 Treffer' : `${helpers.length} Treffer`}
                  </Text>
                </View>
                {helpers.length === 0 ? (
                  <Card>
                    <EmptyText>
                      {`Aktuell erreicht keine verifizierte Helferin und kein verifizierter Helfer dein ${homeLabel}. Sobald jemand seine Reisebereitschaft erweitert, erscheint die Person hier automatisch.`}
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
  filterHint: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  filterLabel: { fontFamily: appFonts.bold, fontSize: 13, marginTop: 10, marginBottom: 4 },
  mapHint: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginBottom: 8 },
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
    left: 10,
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
