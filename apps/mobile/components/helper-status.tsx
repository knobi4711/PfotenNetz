import { useState } from 'react';
import { Text } from 'react-native';
import { StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import {
  useOwnVerifications,
  useRequestHelperStatus,
  useUpdateOwnLocation,
  type Profile,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
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
  const updateLocation = useUpdateOwnLocation();
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSaved, setLocationSaved] = useState<string | null>(null);

  const isHelper = profile.role === 'helper';
  const verifications = verificationsQuery.data ?? [];

  const saveLocation = () => {
    setLocationPending(true);
    setLocationError(null);
    setLocationSaved(null);
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
        await updateLocation.mutateAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationSaved(
          'Standort sicher gespeichert. Er wird auf der Karte nur gerundet angezeigt.'
        );
      } catch (error: unknown) {
        setLocationError(
          error instanceof Error ? error.message : 'Standort konnte nicht gespeichert werden.'
        );
      } finally {
        setLocationPending(false);
      }
    })();
  };

  return (
    <Card>
      <SectionTitle>Helper-Status</SectionTitle>
      <InfoRow label="Rolle" value={isHelper ? 'Helper' : 'Nutzer:in'} />
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

      {!isHelper ? (
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

      {updateLocation.isError ? (
        <ErrorBox
          message={`Standort konnte nicht gespeichert werden: ${updateLocation.error.message}`}
        />
      ) : null}
      {locationError !== null ? <ErrorBox message={locationError} /> : null}
      {locationSaved !== null ? (
        <Text style={[styles.saved, { color: c.success }]}>{locationSaved}</Text>
      ) : null}
      <ActionButton
        title={
          profile.location_updated_at !== null ? 'Standort aktualisieren' : 'Standort speichern'
        }
        variant="secondary"
        pending={locationPending || updateLocation.isPending}
        onPress={saveLocation}
      />
      <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
        Dein exakter Standort wird nie an andere Nutzer:innen übertragen – die Suche liefert nur auf
        ca. 100 m gerundete Positionen.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  saved: { fontSize: 13, marginTop: 8, fontWeight: '600' },
});
