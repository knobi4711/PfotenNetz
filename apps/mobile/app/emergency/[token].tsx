import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  fetchPublicEmergencyCard,
  getSupabaseClient,
  PET_SPECIES_LABELS,
  type PublicEmergencyCard,
  type PetSpecies,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';
import {
  loadPublicEmergencyCard,
  removePublicEmergencyCard,
  savePublicEmergencyCard,
} from '../../lib/public-emergency-cache';

function valid(card: PublicEmergencyCard | null): card is PublicEmergencyCard {
  return card !== null && Date.parse(card.expires_at) > Date.now();
}

export default function PublicEmergencyScreen() {
  const c = usePalette();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [card, setCard] = useState<PublicEmergencyCard | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void (async () => {
      const cached = await loadPublicEmergencyCard(token);
      try {
        const fresh = await fetchPublicEmergencyCard(getSupabaseClient(), token);
        if (!valid(fresh)) {
          await removePublicEmergencyCard(token);
          if (active) setError('Der Link ist abgelaufen oder wurde widerrufen.');
          return;
        }
        await savePublicEmergencyCard(token, fresh);
        if (active) setCard(fresh);
      } catch {
        if (active && cached && valid(cached.card)) {
          setCard(cached.card);
          setOffline(true);
        } else if (active) {
          setError('Notfallkarte ist offline nicht verfügbar.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) return <LoadingView label="Notfallkarte wird geladen …" />;
  if (!card) {
    return (
      <View style={[styles.center, { backgroundColor: c.surface }]}>
        <ErrorBox message={error ?? 'Notfallkarte nicht verfügbar.'} />
        <ActionButton title="Zurück" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: c.onSurface }]}>Digitale Notfallkarte</Text>
      {offline ? (
        <Text
          style={[styles.offline, { color: c.onErrorContainer, backgroundColor: c.errorContainer }]}
        >
          Offline-Modus: zuletzt synchronisierte Karte.
        </Text>
      ) : null}
      <Card>
        <Text style={styles.emoji}>
          {card.species === 'cat' ? '🐱' : card.species === 'dog' ? '🐶' : '🐾'}
        </Text>
        <Text style={[styles.name, { color: c.onSurface }]}>{card.name}</Text>
        <Text style={[styles.muted, { color: c.onSurfaceVariant }]}>
          {PET_SPECIES_LABELS[card.species as PetSpecies] ?? card.species}
        </Text>
      </Card>
      <Card>
        <SectionTitle>Wichtige Hinweise</SectionTitle>
        <Info label="Chipnummer" value={card.microchip_number} />
        <Info label="Medikamente" value={list(card.medications)} />
        <Info label="Allergien" value={list(card.allergies)} />
        <Info label="Besonderes" value={card.special_needs} />
        <Info label="Tierarztpraxis" value={card.vet_clinic} />
        {card.vet_phone ? (
          <ActionButton
            title="Tierarzt anrufen"
            variant="secondary"
            onPress={() => void Linking.openURL(`tel:${card.vet_phone}`)}
          />
        ) : null}
      </Card>
      <EmptyText>Gültig bis {new Date(card.expires_at).toLocaleDateString('de-DE')}.</EmptyText>
      <ActionButton title="Zurück" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

function list(value: unknown): string {
  return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'Keine Angaben';
}

function Info({ label, value }: { label: string; value: string | null }) {
  const c = usePalette();
  return (
    <Text style={[styles.info, { color: c.onSurface }]}>
      <Text style={{ color: c.onSurfaceVariant }}>{label}: </Text>
      {value || 'Keine Angaben'}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontFamily: appFonts.extrabold, fontSize: 28, marginTop: 32 },
  name: { fontFamily: appFonts.extrabold, fontSize: 28, marginTop: 12 },
  emoji: { fontSize: 56 },
  muted: { fontFamily: appFonts.regular, fontSize: 15, marginTop: 4 },
  offline: { borderRadius: 12, fontFamily: appFonts.semibold, padding: 12 },
  info: { fontFamily: appFonts.regular, fontSize: 15, lineHeight: 23, marginTop: 10 },
});
