import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  useAdminHelperVerifications,
  useOwnProfile,
  useReviewHelperVerification,
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

const TYPE_LABELS = {
  id_document: 'Ausweis',
  liability_insurance: 'Haftpflichtversicherung',
} as const;

function groupByUser<T extends { user_id: string }>(requests: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const request of requests) {
    groups.set(request.user_id, [...(groups.get(request.user_id) ?? []), request]);
  }
  return [...groups.values()];
}

export default function HelperVerificationAdminScreen() {
  const c = usePalette();
  const profile = useOwnProfile();
  const query = useAdminHelperVerifications();
  const review = useReviewHelperVerification();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  if (profile.isPending) return <LoadingView label="Berechtigung wird geprüft …" />;
  if (profile.data?.role !== 'admin') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: c.surface }]}
        contentContainerStyle={styles.content}
      >
        <AppHeader title="Helper-Anfragen" />
        <ErrorBox message="Diese Ansicht ist nur für Administrator:innen verfügbar." />
        <ActionButton title="Zurück" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  const requests = query.data ?? [];
  const requestGroups = groupByUser(requests);
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader title="Helper-Anfragen" subtitle="Verifizierungen prüfen und freigeben." />
      <BackButton onPress={() => router.back()} />
      {query.isPending ? <LoadingView label="Anfragen werden geladen …" /> : null}
      {query.isError ? (
        <ErrorBox
          message={`Anfragen konnten nicht geladen werden: ${query.error.message}`}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {!query.isPending && !query.isError && requestGroups.length === 0 ? (
        <Card>
          <EmptyText>Keine offenen Helper-Anfragen vorhanden.</EmptyText>
        </Card>
      ) : null}
      {requestGroups.map((requestsForUser) => {
        const request = requestsForUser[0];
        if (!request) return null;
        return (
          <Card key={request.user_id}>
            <SectionTitle>{request.display_name}</SectionTitle>
            <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>{request.email}</Text>
            <Text style={[styles.body, { color: c.onSurface }]}>
              {requestsForUser.length} Prüfungen in dieser Helper-Anfrage · Antrag vom{' '}
              {new Date(request.created_at).toLocaleDateString('de-DE')}
            </Text>
            <TextInput
              value={reasons[request.user_id] ?? ''}
              onChangeText={(value) =>
                setReasons((current) => ({ ...current, [request.user_id]: value }))
              }
              placeholder="Ablehnungsgrund (optional)"
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
            {review.isError ? (
              <ErrorBox
                message={`Anfrage konnte nicht verarbeitet werden: ${review.error.message}`}
              />
            ) : null}
            {requestsForUser.map((verification) => (
              <View key={verification.verification_id} style={styles.verification}>
                <Text style={[styles.verificationTitle, { color: c.onSurface }]}>
                  {TYPE_LABELS[verification.verification_type as keyof typeof TYPE_LABELS] ??
                    verification.verification_type}
                </Text>
                <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
                  {verification.storage_paths.length} Dokument(e) hochgeladen
                </Text>
                <View style={styles.actions}>
                  <ActionButton
                    title="Freigeben"
                    pending={review.isPending}
                    onPress={() =>
                      review.mutate({
                        verificationId: verification.verification_id,
                        status: 'approved',
                      })
                    }
                  />
                  <ActionButton
                    title="Ablehnen"
                    variant="danger"
                    pending={review.isPending}
                    onPress={() =>
                      review.mutate({
                        verificationId: verification.verification_id,
                        status: 'rejected',
                        rejectionReason: reasons[request.user_id]?.trim() || null,
                      })
                    }
                  />
                </View>
              </View>
            ))}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
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
  verification: { borderTopWidth: 1, borderTopColor: '#eadbd5', paddingTop: 14, marginTop: 14 },
  verificationTitle: { fontFamily: appFonts.semibold, fontSize: 15 },
});
