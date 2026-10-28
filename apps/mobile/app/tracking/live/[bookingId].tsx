import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  formatTrackingRadius,
  useActiveTrackingSessions,
  useBooking,
  useCurrentUser,
  useTrackingPoints,
  useTrackingSubscription,
} from '@pfotennetz/supabase';
import { formatDate } from '@pfotennetz/shared';
import {
  AppHeader,
  BackButton,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  StatusBadge,
  appFonts,
  usePalette,
} from '../../../components/ui';
import { LiveTrackingMap } from '../../../components/live-tracking-map';

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} Std. ${minutes} Min.`;
  if (minutes > 0) return `${minutes} Min.`;
  return `${seconds} Sek.`;
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = usePalette();
  return (
    <View style={[styles.stat, { backgroundColor: c.surfaceContainerLow }]}>
      <Text style={[styles.statLabel, { color: c.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.onSurface }]}>{value}</Text>
    </View>
  );
}

export default function LiveTrackingScreen() {
  const c = usePalette();
  const params = useLocalSearchParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const bookingQuery = useBooking(bookingId);
  const sessions = useActiveTrackingSessions();
  const userQuery = useCurrentUser();
  useTrackingSubscription();

  const booking = bookingQuery.data ?? null;
  const session = sessions.data?.find((item) => item.booking_id === bookingId) ?? null;
  const points = useTrackingPoints(session?.id ?? null);
  const [refreshing, setRefreshing] = useState(false);

  const isHelper = booking !== null && booking.helper_id === userQuery.data?.id;
  const petNames = booking?.pet?.name ?? 'Tier';
  const latitude = session?.latest_latitude ?? null;
  const longitude = session?.latest_longitude ?? null;
  const hasPosition = latitude !== null && longitude !== null;
  const trackPoints = points.data ?? [];
  const terminal =
    booking !== null &&
    (booking.status === 'completed' ||
      booking.status === 'cancelled' ||
      booking.status === 'disputed');

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        bookingQuery.refetch(),
        sessions.refetch(),
        points.refetch(),
        userQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        <BackButton onPress={() => router.back()} />
        <AppHeader
          title="Live-Standort"
          subtitle={
            booking !== null
              ? `${booking.booking_number} · ${petNames}`
              : 'Betreuung wird geladen …'
          }
        />

        {bookingQuery.isPending ? (
          <LoadingView label="Betreuung wird geladen …" />
        ) : bookingQuery.isError ? (
          <ErrorBox
            message={`Betreuung konnte nicht geladen werden: ${bookingQuery.error.message}`}
            onRetry={() => {
              void bookingQuery.refetch();
            }}
          />
        ) : booking === null ? (
          <Card>
            <EmptyText>Diese Betreuung wurde nicht gefunden.</EmptyText>
          </Card>
        ) : (
          <>
            <Card>
              <View style={styles.headerRow}>
                <View style={styles.headerMain}>
                  <SectionTitle>{petNames}</SectionTitle>
                  <Text style={[styles.subline, { color: c.onSurfaceVariant }]}>
                    {isHelper
                      ? 'Du überträgst deinen Standort für diese Betreuung.'
                      : 'Dein:e Helfer:in ist unterwegs.'}
                  </Text>
                </View>
                <StatusBadge status={booking.status} />
              </View>

              {terminal ? (
                <EmptyText>
                  Diese Betreuung ist abgeschlossen. Es wird kein Live-Standort mehr übertragen.
                </EmptyText>
              ) : sessions.isPending ? (
                <LoadingView label="Live-Status wird geladen …" />
              ) : session === null ? (
                <EmptyText>
                  {isHelper
                    ? 'Starte die GPS-Aufzeichnung in den Buchungsdetails, damit der Anbieter dich sehen kann.'
                    : 'Das Live-Tracking startet, sobald dein:e Helfer:in die Betreuung vor Ort beginnt.'}
                </EmptyText>
              ) : !hasPosition ? (
                <EmptyText>Warte auf die erste sichere GPS-Position …</EmptyText>
              ) : (
                <>
                  <View style={styles.liveBadgeRow}>
                    <View style={[styles.liveDot, { backgroundColor: c.secondary }]} />
                    <Text style={[styles.liveLabel, { color: c.secondary }]}>
                      ● Live
                      {session.latest_recorded_at !== null
                        ? ` · Stand ${formatDate(session.latest_recorded_at, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}`
                        : ''}
                    </Text>
                  </View>
                  <LiveTrackingMap
                    points={trackPoints}
                    latitude={latitude}
                    longitude={longitude}
                    radiusMeters={booking.tracking_radius_m}
                  />
                  <View style={styles.statsGrid}>
                    <Stat
                      label="Distanz"
                      value={`${(session.total_distance_meters / 1000).toFixed(2)} km`}
                    />
                    <Stat label="Dauer" value={formatDuration(session.total_duration_seconds)} />
                    <Stat
                      label="Sicherheitszone"
                      value={formatTrackingRadius(booking.tracking_radius_m)}
                    />
                  </View>
                  {session.latest_accuracy_meters !== null ? (
                    <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
                      GPS-Genauigkeit: ±{Number(session.latest_accuracy_meters).toFixed(0)} m
                    </Text>
                  ) : null}
                </>
              )}
            </Card>

            <Card>
              <SectionTitle>Buchung</SectionTitle>
              <Text style={[styles.detailLine, { color: c.onSurfaceVariant }]}>
                Start:{' '}
                {formatDate(booking.start_at, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={[styles.detailLine, { color: c.onSurfaceVariant }]}>
                Ende:{' '}
                {formatDate(booking.end_at, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
                Die Live-Position wird nur während der Betreuung übertragen und ist ausschließlich
                für die beiden Beteiligten sichtbar.
              </Text>
              <Text
                accessibilityRole="button"
                accessibilityLabel="Zur Buchung"
                onPress={() => {
                  router.push({ pathname: '/booking/[id]', params: { id: booking.id } });
                }}
                style={[styles.link, { color: c.primary }]}
              >
                Buchungsdetails öffnen
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerMain: { flexShrink: 1, flex: 1 },
  subline: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 2 },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveLabel: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  statLabel: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16 },
  statValue: { fontFamily: appFonts.bold, fontSize: 15, lineHeight: 20, marginTop: 2 },
  hint: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 10 },
  detailLine: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20 },
  link: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20, marginTop: 12 },
});
