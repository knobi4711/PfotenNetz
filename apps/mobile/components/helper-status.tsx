import { StyleSheet, Text } from 'react-native';
import { useOwnVerifications, useRequestHelperStatus, type Profile } from '@pfotennetz/supabase';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from './ui';

const VERIFICATION_LABELS: Record<string, string> = {
  id_document: 'Ausweisdokument',
  liability_insurance: 'Haftpflichtversicherung',
  guarantor: 'Bürgschaft',
  pet_owner_proof: 'Tierhalter-Nachweis',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'In Prüfung',
  approved: 'Bestätigt',
  rejected: 'Abgelehnt',
  expired: 'Abgelaufen',
};

function trustLabel(trustLevel: string): string {
  if (trustLevel === 'gold') return 'Gold-verifiziert';
  if (trustLevel === 'silver') return 'Silber-verifiziert';
  if (trustLevel === 'bronze') return 'Bronze';
  return 'Basis';
}

export function HelperStatusCard({ profile }: { profile: Profile }) {
  const c = usePalette();
  const verificationsQuery = useOwnVerifications();
  const requestHelper = useRequestHelperStatus();

  // Admins keep their moderation role but may also offer care work once verified.
  const canOfferHelp =
    (profile.role === 'helper' || profile.role === 'admin') &&
    (profile.trust_level === 'silver' || profile.trust_level === 'gold');
  const roleLabel =
    profile.role === 'admin'
      ? canOfferHelp
        ? 'Admin & Helper'
        : 'Admin'
      : canOfferHelp
        ? 'Helper'
        : 'Nutzer:in';
  const verifications = verificationsQuery.data ?? [];

  return (
    <Card>
      <SectionTitle>Helper-Status</SectionTitle>
      <InfoRow label="Rolle" value={roleLabel} />
      <InfoRow label="Vertrauen" value={trustLabel(profile.trust_level)} />
      <InfoRow
        label="Standort"
        value={
          profile.location_updated_at !== null
            ? `Gespeichert (${new Date(profile.location_updated_at).toLocaleDateString('de-DE')})`
            : 'Noch nicht gespeichert'
        }
      />

      {verificationsQuery.isPending ? (
        <LoadingView label="Verifizierung wird geladen …" />
      ) : verificationsQuery.isError ? (
        <ErrorBox
          message={`Verifizierung konnte nicht geladen werden: ${verificationsQuery.error.message}`}
          onRetry={() => {
            void verificationsQuery.refetch();
          }}
        />
      ) : verifications.length === 0 ? (
        <EmptyText>
          Noch keine Verifizierung angefragt. Als verifizierte:r Helper wirst du auf der Karte
          gefunden.
        </EmptyText>
      ) : (
        verifications.map((v) => (
          <InfoRow
            key={v.id}
            label={VERIFICATION_LABELS[v.type] ?? v.type}
            value={STATUS_LABELS[v.status] ?? v.status}
          />
        ))
      )}

      {profile.role === 'admin' && canOfferHelp ? (
        <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
          Du bleibst Administrator und erscheinst zusätzlich in der Helfersuche, sobald Standort und
          Verfügbarkeiten hinterlegt sind.
        </Text>
      ) : null}

      {!canOfferHelp ? (
        <>
          {requestHelper.isError ? (
            <ErrorBox message={`Anfrage fehlgeschlagen: ${requestHelper.error.message}`} />
          ) : null}
          <ActionButton
            title="Helper-Status beantragen"
            pending={requestHelper.isPending}
            onPress={() => {
              requestHelper.mutate();
            }}
          />
          <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
            Erstellt je eine Prüf-Anfrage für Ausweis und Haftpflicht. Rolle und Vertrauen bleiben
            server-seitig verwaltet und werden erst nach Admin-Freigabe gesetzt.
          </Text>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 17, marginTop: 8 },
});
