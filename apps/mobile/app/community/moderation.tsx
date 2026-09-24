import { ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import {
  EVENT_TYPE_LABELS,
  useCommunityModerationEvents,
  useModerateCommunityEvent,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  BackButton,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';

export default function CommunityModerationScreen() {
  const c = usePalette();
  const query = useCommunityModerationEvents();
  const moderate = useModerateCommunityEvent();
  const events = query.data ?? [];
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Community-Moderation" subtitle="Events prüfen und sichtbar schalten." />
      <BackButton onPress={() => router.back()} />
      {query.isPending ? <LoadingView label="Events werden geladen …" /> : null}
      {query.isError ? (
        <ErrorBox
          message={`Events konnten nicht geladen werden: ${query.error.message}`}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {!query.isPending && !query.isError && events.length === 0 ? (
        <Card>
          <EmptyText>Keine Community-Events vorhanden.</EmptyText>
        </Card>
      ) : null}
      {!query.isPending && !query.isError
        ? events.map((event) => (
            <Card key={event.id}>
              <SectionTitle>{event.title}</SectionTitle>
              <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
                {EVENT_TYPE_LABELS[event.type]} · {event.is_public ? 'Öffentlich' : 'Ausgeblendet'}
              </Text>
              {event.description ? (
                <Text style={[styles.body, { color: c.onSurface }]}>{event.description}</Text>
              ) : null}
              <ActionButton
                title={event.is_public ? 'Event ausblenden' : 'Event veröffentlichen'}
                variant={event.is_public ? 'danger' : 'primary'}
                pending={moderate.isPending}
                onPress={() => moderate.mutate({ eventId: event.id, isPublic: !event.is_public })}
              />
            </Card>
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  meta: { fontFamily: appFonts.regular, fontSize: 13 },
  body: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 20, marginTop: 10 },
});
