import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  EVENT_TYPE_LABELS,
  useCreateCommunityEvent,
  useCurrentUser,
  useJoinCommunityEvent,
  useLeaveCommunityEvent,
  useOwnEventParticipants,
  useOwnProfile,
  useParticipantProfilesForEvents,
  useUpcomingCommunityEvents,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  BackButton,
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
  const user = useCurrentUser();
  const profile = useOwnProfile();
  const participants = useOwnEventParticipants();
  const participantProfiles = useParticipantProfilesForEvents(
    events.data?.map((event) => event.id) ?? []
  );
  const join = useJoinCommunityEvent();
  const leave = useLeaveCommunityEvent();
  const create = useCreateCommunityEvent();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<keyof typeof EVENT_TYPE_LABELS>('group_walk');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const joined = new Set(
    (participants.data ?? []).filter((item) => item.status === 'going').map((item) => item.event_id)
  );
  const createEvent = async () => {
    setFormError(null);
    const starts = new Date(startsAt);
    if (!title.trim() || Number.isNaN(starts.getTime())) {
      setFormError('Bitte gib einen Titel und einen gültigen Beginn ein.');
      return;
    }
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Standortfreigabe wurde nicht erteilt.');
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await create.mutateAsync({
        title: title.trim(),
        type,
        description: description.trim(),
        address: address.trim(),
        startsAt: starts.toISOString(),
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setTitle('');
      setDescription('');
      setAddress('');
      setStartsAt('');
      setShowCreate(false);
    } catch (cause: unknown) {
      setFormError(cause instanceof Error ? cause.message : 'Event konnte nicht erstellt werden.');
    }
  };
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Nachbarschafts-Treff" subtitle="Gemeinsam unterwegs, füreinander da." />
      <BackButton onPress={() => router.back()} />
      <ActionButton
        title={showCreate ? 'Erstellung schließen' : 'Neues Event erstellen'}
        variant="secondary"
        onPress={() => setShowCreate((visible) => !visible)}
      />
      {profile.data?.role === 'admin' ? (
        <ActionButton
          title="Community-Moderation"
          variant="secondary"
          onPress={() => router.push('/community/moderation')}
        />
      ) : null}
      {showCreate ? (
        <Card>
          <SectionTitle>Neues Community-Event</SectionTitle>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titel, z. B. Sonntags-Rudelrunde"
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
          />
          <View style={styles.typeRow}>
            {(Object.entries(EVENT_TYPE_LABELS) as [keyof typeof EVENT_TYPE_LABELS, string][]).map(
              ([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === value }}
                  onPress={() => setType(value)}
                  style={[
                    styles.typeChip,
                    { backgroundColor: type === value ? c.primary : c.surfaceContainerHigh },
                  ]}
                >
                  <Text style={{ color: type === value ? c.onPrimary : c.onSurface }}>{label}</Text>
                </Pressable>
              )
            )}
          </View>
          <TextInput
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder="Beginn (z. B. 2026-10-04T10:00)"
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
          />
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Adresse oder Treffpunkt (optional)"
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface, borderColor: c.outlineVariant }]}
          />
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Beschreibung (optional)"
            placeholderTextColor={c.outline}
            style={[styles.textarea, { color: c.onSurface, borderColor: c.outlineVariant }]}
          />
          {formError ? <ErrorBox message={formError} /> : null}
          <ActionButton
            title="Event speichern"
            pending={create.isPending}
            onPress={() => void createEvent()}
          />
        </Card>
      ) : null}
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
              {event.organizer_id === user.data?.id &&
              participantProfiles.data?.[event.id]?.length ? (
                <Text style={[styles.meta, { color: c.secondary }]}>
                  Teilnehmende:{' '}
                  {participantProfiles.data[event.id]
                    ?.map((profile) => profile.display_name ?? 'Person')
                    .join(' · ')}
                </Text>
              ) : null}
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
    minHeight: 90,
    padding: 14,
    marginTop: 12,
    textAlignVertical: 'top',
    fontFamily: appFonts.regular,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  typeChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  back: { fontFamily: appFonts.bold, textAlign: 'center', padding: 16 },
});
