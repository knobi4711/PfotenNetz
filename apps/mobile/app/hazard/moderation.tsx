import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  HAZARD_SEVERITY_LABELS,
  HAZARD_STATUS_LABELS,
  HAZARD_TYPE_LABELS,
  useModerateHazard,
  useModerationHazards,
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
} from '../../components/ui';

export default function HazardModerationScreen() {
  const c = usePalette();
  const query = useModerationHazards();
  const moderate = useModerateHazard();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const hazards = query.data ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Gefahrenprüfung" subtitle="Meldungen prüfen und Status setzen." />
      {query.isPending ? (
        <LoadingView label="Meldungen werden geladen …" />
      ) : query.isError ? (
        <ErrorBox
          message={`Meldungen konnten nicht geladen werden: ${query.error.message}`}
          onRetry={() => void query.refetch()}
        />
      ) : hazards.length === 0 ? (
        <Card>
          <EmptyText>Keine offenen Meldungen vorhanden.</EmptyText>
        </Card>
      ) : (
        hazards.map((hazard) => (
          <Card key={hazard.id}>
            <SectionTitle>{HAZARD_TYPE_LABELS[hazard.type]}</SectionTitle>
            <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
              {hazard.hazard_number} · {HAZARD_SEVERITY_LABELS[hazard.severity]} ·{' '}
              {HAZARD_STATUS_LABELS[hazard.status]}
            </Text>
            {hazard.address ? (
              <Text style={[styles.body, { color: c.onSurface }]}>{hazard.address}</Text>
            ) : null}
            {hazard.description ? (
              <Text style={[styles.body, { color: c.onSurface }]}>{hazard.description}</Text>
            ) : null}
            <TextInput
              value={notes[hazard.id] ?? ''}
              onChangeText={(value) => setNotes((current) => ({ ...current, [hazard.id]: value }))}
              placeholder="Moderationsnotiz (optional)"
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
            {moderate.isError ? (
              <ErrorBox
                message={`Status konnte nicht geändert werden: ${moderate.error.message}`}
              />
            ) : null}
            <View style={styles.actions}>
              {hazard.status === 'pending_review' ? (
                <ActionButton
                  title="Freigeben"
                  pending={moderate.isPending}
                  onPress={() =>
                    moderate.mutate({
                      hazardId: hazard.id,
                      status: 'active',
                      resolutionNotes: notes[hazard.id]?.trim() || null,
                    })
                  }
                />
              ) : null}
              {hazard.status === 'active' ? (
                <ActionButton
                  title="Als entwarnt markieren"
                  variant="secondary"
                  pending={moderate.isPending}
                  onPress={() =>
                    moderate.mutate({
                      hazardId: hazard.id,
                      status: 'resolved',
                      resolutionNotes: notes[hazard.id]?.trim() || null,
                    })
                  }
                />
              ) : null}
              {hazard.status === 'pending_review' ? (
                <ActionButton
                  title="Ablehnen"
                  variant="danger"
                  pending={moderate.isPending}
                  onPress={() =>
                    moderate.mutate({
                      hazardId: hazard.id,
                      status: 'rejected',
                      resolutionNotes: notes[hazard.id]?.trim() || null,
                    })
                  }
                />
              ) : null}
            </View>
          </Card>
        ))
      )}
      <ActionButton
        title="Zurück zum Gefahrenradar"
        variant="secondary"
        onPress={() => router.replace('/hazard/radar')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  meta: { fontFamily: appFonts.regular, fontSize: 13 },
  body: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 20, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    marginTop: 14,
    fontFamily: appFonts.regular,
  },
  actions: { gap: 8, marginTop: 14 },
});
