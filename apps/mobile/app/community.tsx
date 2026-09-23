import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  EVENT_TYPE_LABELS,
  useJoinCommunityEvent,
  useLeaveCommunityEvent,
  useOwnEventParticipants,
  useUpcomingCommunityEvents,
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

export default function CommunityScreen() {
  const c = usePalette();
  const events = useUpcomingCommunityEvents();
  const participants = useOwnEventParticipants();
  const join = useJoinCommunityEvent();
  const leave = useLeaveCommunityEvent();
  const joined = new Set(
    (participants.data ?? []).filter((item) => item.status === 'going').map((item) => item.event_id)
  );
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Nachbarschafts-Treff" subtitle="Gemeinsam unterwegs, füreinander da." />
      {events.isPending || participants.isPending ? (
        <LoadingView label="Events werden geladen …" />
      ) : events.isError ? (
        <ErrorBox
          message={`Events konnten nicht geladen werden: ${events.error.message}`}
          onRetry={() => void events.refetch()}
        />
      ) : events.data?.length ? (
        events.data.map((event) => {
          const isJoined = joined.has(event.id);
          return (
            <Card key={event.id}>
              <View style={styles.eventTop}>
                <Text style={[styles.eventType, { color: c.secondary }]}>
                  {EVENT_TYPE_LABELS[event.type]}
                </Text>
                <Text style={[styles.date, { color: c.onSurfaceVariant }]}>
                  {new Date(event.starts_at).toLocaleDateString('de-DE')}
                </Text>
              </View>
              <Text style={[styles.title, { color: c.onSurface }]}>{event.title}</Text>
              {event.description ? (
                <Text style={[styles.description, { color: c.onSurfaceVariant }]}>
                  {event.description}
                </Text>
              ) : null}
              <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
                {new Date(event.starts_at).toLocaleString('de-DE')} ·{' '}
                {event.address ?? 'Ort in der Nachbarschaft'}
              </Text>
              <ActionButton
                title={isJoined ? 'Teilnahme zurücknehmen' : 'Teilnehmen'}
                variant={isJoined ? 'secondary' : 'primary'}
                pending={join.isPending || leave.isPending}
                onPress={() => {
                  if (isJoined) leave.mutate(event.id);
                  else join.mutate(event.id);
                }}
              />
            </Card>
          );
        })
      ) : (
        <Card>
          <SectionTitle>Keine kommenden Events</SectionTitle>
          <EmptyText>
            Schau später wieder vorbei oder starte eine Rudelrunde mit deiner Nachbarschaft.
          </EmptyText>
        </Card>
      )}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/home')}>
        <Text style={[styles.back, { color: c.primary }]}>← Zur Übersicht</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  eventType: { fontFamily: appFonts.bold, fontSize: 13, textTransform: 'uppercase' },
  date: { fontFamily: appFonts.semibold, fontSize: 12 },
  title: { fontFamily: appFonts.extrabold, fontSize: 20, lineHeight: 27, marginTop: 10 },
  description: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 20, marginTop: 8 },
  meta: {
    fontFamily: appFonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 14,
  },
  back: { fontFamily: appFonts.bold, textAlign: 'center', padding: 16 },
});
