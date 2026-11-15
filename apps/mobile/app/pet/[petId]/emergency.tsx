import { Share, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import {
  createEmergencyCardLink,
  getSupabaseClient,
  PET_SPECIES_LABELS,
  useOwnEmergencyCardLinks,
  useOwnPets,
  useRevokeEmergencyCardLink,
  type PetSpecies,
} from '@pfotennetz/supabase';
import { TASSO_PHONE_NUMBER } from '@pfotennetz/shared';
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
} from '../../../components/ui';
import { PetEmergencyCard } from '../../../components/pet-emergency-card';
import {
  loadEmergencyCardSnapshot,
  saveEmergencyCardSnapshot,
  type EmergencyCardSnapshot,
} from '../../../lib/emergency-cache';
import {
  buildEmergencyCardSnapshot,
  calculatePetAge,
  formatEmergencyList,
  petToEmergencyCardData,
  snapshotToEmergencyCardData,
} from '../../../lib/pet-emergency';
import { webBaseUrl } from '../../../lib/web-url';

export default function EmergencyCardScreen() {
  const c = usePalette();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const pets = useOwnPets();
  const links = useOwnEmergencyCardLinks();
  const revokeLink = useRevokeEmergencyCardLink();
  const pet = pets.data?.find((item) => item.id === petId) ?? null;
  const [linkPending, setLinkPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [cachedCard, setCachedCard] = useState<EmergencyCardSnapshot | null>(null);

  useEffect(() => {
    if (!petId) return;
    void loadEmergencyCardSnapshot(petId)
      .then(setCachedCard)
      .catch(() => undefined);
  }, [petId]);

  useEffect(() => {
    if (!pet) return;
    void saveEmergencyCardSnapshot(buildEmergencyCardSnapshot(pet)).catch(() => undefined);
  }, [pet]);

  if (pets.isPending && cachedCard === null)
    return <LoadingView label="Notfallkarte wird geladen …" />;
  if ((pets.isPending || pets.isError) && cachedCard !== null)
    return <OfflineEmergencyCard card={cachedCard} />;
  if (pets.isError)
    return (
      <View style={styles.container}>
        <ErrorBox message={`Notfallkarte konnte nicht geladen werden: ${pets.error.message}`} />
      </View>
    );
  if (pet === null)
    return (
      <View style={styles.container}>
        <EmptyText>Dieses Tierprofil wurde nicht gefunden.</EmptyText>
      </View>
    );

  const shareCard = async () => {
    setLinkPending(true);
    setLinkError(null);
    try {
      const token = [...(await Crypto.getRandomBytesAsync(32))]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      await createEmergencyCardLink(getSupabaseClient(), pet.id, token);
      const webUrl = webBaseUrl();
      const publicUrl = `${webUrl}/emergency/${token}`;
      await Share.share({
        title: `Notfallkarte ${pet.name}`,
        message: `PfotenNetz Notfallkarte (Link 30 Tage gültig)\n\n${publicUrl}\n\nName: ${pet.name}\nTierart: ${PET_SPECIES_LABELS[pet.species as PetSpecies] ?? pet.species}\nAlter: ${calculatePetAge(pet.birth_date)}\nChipnummer: ${pet.microchip_number ?? 'Nicht angegeben'}\nTasso-Nummer: ${pet.tasso_number ?? 'Nicht angegeben'}\nTasso-Telefon: ${TASSO_PHONE_NUMBER}\nMedikamente: ${formatEmergencyList(pet.medications)}\nAllergien: ${pet.allergies?.join(', ') || 'Keine Angaben'}\nTierarzt: ${pet.vet_clinic ?? 'Nicht angegeben'} · ${pet.vet_phone ?? 'Keine Telefonnummer'}\nBesonderes: ${pet.special_needs ?? 'Keine Angaben'}`,
      });
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Link konnte nicht erstellt werden.');
    } finally {
      setLinkPending(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader
        title="Digitale Notfallkarte"
        subtitle={`Wichtige Informationen zu ${pet.name}.`}
      />
      <PetEmergencyCard card={petToEmergencyCardData(pet)} />
      {links.data
        ?.filter(
          (link) =>
            link.pet_id === pet.id &&
            link.revoked_at === null &&
            new Date(link.expires_at) > new Date()
        )
        .map((link) => (
          <Card key={link.id}>
            <SectionTitle>Öffentliche Freigabe aktiv</SectionTitle>
            <Text style={[styles.notes, { color: c.onSurface }]}>
              Gültig bis {new Date(link.expires_at).toLocaleDateString('de-DE')}.
            </Text>
            <ActionButton
              title="Freigabe sofort widerrufen"
              variant="danger"
              pending={revokeLink.isPending}
              onPress={() => revokeLink.mutate(link.id)}
            />
          </Card>
        ))}
      {linkError ? <ErrorBox message={linkError} /> : null}
      <ActionButton
        title={linkPending ? 'Sicherer Link wird erstellt …' : 'Notfallkarte sicher teilen'}
        onPress={() => void shareCard()}
        disabled={linkPending}
      />
      <ActionButton
        title="Tier bearbeiten"
        variant="secondary"
        onPress={() => router.push({ pathname: '/(tabs)/pets', params: { editPetId: pet.id } })}
      />
      <ActionButton title="Zurück" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

function OfflineEmergencyCard({ card }: { card: EmergencyCardSnapshot }) {
  const c = usePalette();
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.surface }]}
      contentContainerStyle={styles.content}
    >
      <AppHeader
        title="Offline-Notfallkarte"
        subtitle={`Gespeicherte Informationen zu ${card.name}.`}
      />
      <PetEmergencyCard card={snapshotToEmergencyCardData(card)} offlineSavedAt={card.savedAt} />
      <ActionButton title="Zurück" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { paddingBottom: 40 },
  notes: { fontFamily: appFonts.regular, fontSize: 15, lineHeight: 23 },
});
