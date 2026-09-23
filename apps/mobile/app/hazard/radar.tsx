import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import {
  useActiveHazards,
  useHazardSubscription,
  useOwnHazards,
  HAZARD_STATUS_LABELS,
  HAZARD_SEVERITY_LABELS,
  HAZARD_TYPE_LABELS,
  type ActiveHazard,
  type Hazard,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  Card,
  Chip,
  ChipRow,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';

const RADII = [0.5, 1, 1.5, 3] as const;

function severityColor(severity: string, colors: ReturnType<typeof usePalette>): string {
  if (severity === 'critical' || severity === 'high') return colors.error;
  if (severity === 'medium') return colors.primary;
  return colors.secondary;
}

function HazardRow({ hazard }: { hazard: ActiveHazard }) {
  const c = usePalette();
  const color = severityColor(hazard.severity, c);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${HAZARD_TYPE_LABELS[hazard.type as keyof typeof HAZARD_TYPE_LABELS] ?? hazard.type} öffnen`}
      onPress={() => router.push({ pathname: '/hazard/[id]', params: { id: hazard.id } })}
    >
      <Card>
        <View style={styles.rowTop}>
          <Text style={[styles.type, { color: c.onSurface }]}>
            {HAZARD_TYPE_LABELS[hazard.type as keyof typeof HAZARD_TYPE_LABELS] ?? hazard.type}
          </Text>
          <View style={[styles.severity, { backgroundColor: color }]}>
            <Text style={[styles.severityText, { color: c.onPrimary }]}>
              {HAZARD_SEVERITY_LABELS[hazard.severity as keyof typeof HAZARD_SEVERITY_LABELS] ??
                hazard.severity}
            </Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
          ca. {Number(hazard.distance_km).toLocaleString('de-DE')} km entfernt · Radius{' '}
          {hazard.radius_km} km
        </Text>
        {hazard.description ? (
          <Text style={[styles.description, { color: c.onSurface }]}>{hazard.description}</Text>
        ) : null}
        <Text style={[styles.openHint, { color: c.primary }]}>
          Details und Rückmeldung öffnen →
        </Text>
      </Card>
    </Pressable>
  );
}

function OwnHazardRow({ hazard }: { hazard: Hazard }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Eigene Meldung ${hazard.hazard_number} öffnen`}
      onPress={() => router.push({ pathname: '/hazard/[id]', params: { id: hazard.id } })}
    >
      <View
        style={[
          styles.ownRow,
          { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
        ]}
      >
        <View style={styles.ownMain}>
          <Text style={[styles.ownType, { color: c.onSurface }]}>
            {HAZARD_TYPE_LABELS[hazard.type]}
          </Text>
          <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>{hazard.hazard_number}</Text>
        </View>
        <Text
          style={[styles.ownStatus, { color: hazard.status === 'rejected' ? c.error : c.primary }]}
        >
          {HAZARD_STATUS_LABELS[hazard.status]}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HazardRadarScreen() {
  const c = usePalette();
  useHazardSubscription();
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<(typeof RADII)[number]>(1.5);
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const hazardsQuery = useActiveHazards(center === null ? null : { ...center, radiusKm });
  const ownHazardsQuery = useOwnHazards();
  const hazards = hazardsQuery.data ?? [];

  const locate = () => {
    setLocationPending(true);
    setLocationError(null);
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) throw new Error('Standortfreigabe wurde nicht erteilt.');
        const cached = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 1000,
        });
        const position =
          cached ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
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
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Gefahrenradar" subtitle="Aktive Warnungen in deiner Nachbarschaft." />
      <View style={styles.actions}>
        <ActionButton title="Gefahr melden" onPress={() => router.push('/hazard/report')} />
        <ActionButton
          title={center === null ? 'Standort verwenden' : 'Standort aktualisieren'}
          variant="secondary"
          pending={locationPending}
          onPress={locate}
        />
      </View>
      <ChipRow>
        {RADII.map((radius) => (
          <Chip
            key={radius}
            label={`${radius.toString().replace('.', ',')} km`}
            selected={radius === radiusKm}
            onPress={() => setRadiusKm(radius)}
          />
        ))}
      </ChipRow>
      {locationError ? <ErrorBox message={locationError} /> : null}
      {ownHazardsQuery.data && ownHazardsQuery.data.length > 0 ? (
        <Card>
          <SectionTitle>Meine Meldungen</SectionTitle>
          {ownHazardsQuery.data.slice(0, 5).map((hazard) => (
            <OwnHazardRow key={hazard.id} hazard={hazard} />
          ))}
        </Card>
      ) : null}
      {center === null ? (
        <Card>
          <EmptyText>
            Aktiviere deinen Standort, um Gefahrenmeldungen in deiner Nähe zu sehen.
          </EmptyText>
        </Card>
      ) : hazardsQuery.isPending ? (
        <LoadingView label="Gefahren werden geladen …" />
      ) : hazardsQuery.isError ? (
        <ErrorBox
          message={`Gefahren konnten nicht geladen werden: ${hazardsQuery.error.message}`}
          onRetry={() => void hazardsQuery.refetch()}
        />
      ) : (
        <>
          <View style={styles.heading}>
            <SectionTitle>Aktive Warnungen</SectionTitle>
            <Text style={[styles.count, { color: c.secondary }]}>{hazards.length} Treffer</Text>
          </View>
          {hazards.length === 0 ? (
            <Card>
              <EmptyText>In diesem Radius sind aktuell keine aktiven Gefahren bekannt.</EmptyText>
            </Card>
          ) : (
            hazards.map((hazard) => <HazardRow key={hazard.id} hazard={hazard} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  actions: { gap: 10, marginBottom: 12 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  count: { fontFamily: appFonts.bold, fontSize: 13 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  type: { flex: 1, fontFamily: appFonts.bold, fontSize: 17, lineHeight: 23 },
  severity: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  severityText: { fontFamily: appFonts.bold, fontSize: 11 },
  meta: { fontFamily: appFonts.regular, fontSize: 12, marginTop: 8 },
  description: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 20, marginTop: 10 },
  openHint: { fontFamily: appFonts.semibold, fontSize: 12, marginTop: 12 },
  ownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  ownMain: { flex: 1, gap: 2 },
  ownType: { fontFamily: appFonts.semibold, fontSize: 14 },
  ownStatus: { fontFamily: appFonts.bold, fontSize: 12 },
});
