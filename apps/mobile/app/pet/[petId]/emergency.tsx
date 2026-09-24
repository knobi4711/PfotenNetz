import { Image, Linking, Share, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import {
  loadEmergencyCardSnapshot,
  saveEmergencyCardSnapshot,
  type EmergencyCardSnapshot,
} from '../../../lib/emergency-cache';
import { phoneUrl } from '../../../lib/phone';

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'Nicht angegeben';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 'Nicht angegeben';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age -= 1;
  return age >= 0 ? `${age} Jahre` : 'Nicht angegeben';
}

function jsonList(value: unknown): string {
  if (!Array.isArray(value)) return 'Keine Angaben';
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  );
  return items.length > 0 ? items.join(', ') : 'Keine Angaben';
}

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
    void saveEmergencyCardSnapshot({
      petId: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birth_date,
      microchipNumber: pet.microchip_number,
      medications: Array.isArray(pet.medications)
        ? pet.medications.filter((item): item is string => typeof item === 'string')
        : [],
      allergies: pet.allergies ?? [],
      vetClinic: pet.vet_clinic,
      vetPhone: pet.vet_phone,
      insurancePolicy: pet.insurance_policy,
      specialNeeds: pet.special_needs,
      savedAt: new Date().toISOString(),
    }).catch(() => undefined);
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
      const webUrl = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');
      if (!webUrl) {
        throw new Error('Die öffentliche Web-URL ist nicht konfiguriert.');
      }
      const publicUrl = `${webUrl}/emergency/${token}`;
      await Share.share({
        title: `Notfallkarte ${pet.name}`,
        message: `PfotenNetz Notfallkarte (Link 30 Tage gültig)\n\n${publicUrl}\n\nName: ${pet.name}\nTierart: ${PET_SPECIES_LABELS[pet.species as PetSpecies] ?? pet.species}\nAlter: ${calculateAge(pet.birth_date)}\nChipnummer: ${pet.microchip_number ?? 'Nicht angegeben'}\nMedikamente: ${jsonList(pet.medications)}\nAllergien: ${pet.allergies?.join(', ') || 'Keine Angaben'}\nTierarzt: ${pet.vet_clinic ?? 'Nicht angegeben'} · ${pet.vet_phone ?? 'Keine Telefonnummer'}\nBesonderes: ${pet.special_needs ?? 'Keine Angaben'}`,
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
      <Card>
        <View style={[styles.hero, { backgroundColor: c.primaryFixed }]}>
          {pet.avatar_url ? (
            <Image
              accessibilityLabel={`Foto von ${pet.name}`}
              source={{ uri: pet.avatar_url }}
              style={styles.heroImage}
            />
          ) : (
            <Text style={styles.emoji}>
              {pet.species === 'cat' ? '🐱' : pet.species === 'dog' ? '🐶' : '🐾'}
            </Text>
          )}
          <Text style={[styles.name, { color: c.onPrimaryFixed }]}>{pet.name}</Text>
          <Text style={[styles.species, { color: c.onPrimaryFixedVariant }]}>
            {PET_SPECIES_LABELS[pet.species as PetSpecies] ?? pet.species}
          </Text>
        </View>
        <SectionTitle>Steckbrief</SectionTitle>
        <View style={styles.grid}>
          <Info label="Alter" value={calculateAge(pet.birth_date)} />
          <Info label="Rasse" value={pet.breed ?? 'Nicht angegeben'} />
          <Info label="Farbe" value={pet.color ?? 'Nicht angegeben'} />
          <Info
            label="Status"
            value={pet.is_deceased ? 'Verstorben' : pet.is_active ? 'Aktiv' : 'Pausiert'}
          />
          <Info label="Chipnummer" value={pet.microchip_number ?? 'Nicht angegeben'} />
        </View>
      </Card>
      <Card>
        <SectionTitle>Medizinische Hinweise</SectionTitle>
        <View style={styles.grid}>
          <Info label="Medikamente" value={jsonList(pet.medications)} />
          <Info label="Allergien" value={pet.allergies?.join(', ') || 'Keine Angaben'} />
          <Info label="Tierarztpraxis" value={pet.vet_clinic ?? 'Nicht angegeben'} />
          <Info label="Tierarzt-Telefon" value={pet.vet_phone ?? 'Nicht angegeben'} />
          <Info label="Versicherung" value={pet.insurance_policy ?? 'Nicht angegeben'} />
        </View>
        <Text style={[styles.notes, { color: c.onSurface }]}>
          {pet.special_needs ?? 'Keine besonderen Hinweise hinterlegt.'}
        </Text>
      </Card>
      {phoneUrl(pet.vet_phone) ? (
        <ActionButton
          title="Tierarzt direkt anrufen"
          onPress={() => void Linking.openURL(phoneUrl(pet.vet_phone) as string)}
        />
      ) : null}
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
      <Card>
        <Text
          style={[
            styles.offlineBanner,
            { color: c.onErrorContainer, backgroundColor: c.errorContainer },
          ]}
        >
          Keine Internetverbindung. Zuletzt synchronisiert am{' '}
          {new Date(card.savedAt).toLocaleString('de-DE')}.
        </Text>
        <SectionTitle>Steckbrief</SectionTitle>
        <View style={styles.grid}>
          <Info label="Name" value={card.name} />
          <Info
            label="Tierart"
            value={PET_SPECIES_LABELS[card.species as PetSpecies] ?? card.species}
          />
          <Info label="Alter" value={calculateAge(card.birthDate)} />
          <Info label="Rasse" value={card.breed ?? 'Nicht angegeben'} />
          <Info label="Chipnummer" value={card.microchipNumber ?? 'Nicht angegeben'} />
        </View>
      </Card>
      <Card>
        <SectionTitle>Medizinische Hinweise</SectionTitle>
        <View style={styles.grid}>
          <Info label="Medikamente" value={jsonList(card.medications)} />
          <Info label="Allergien" value={card.allergies.join(', ') || 'Keine Angaben'} />
          <Info label="Tierarztpraxis" value={card.vetClinic ?? 'Nicht angegeben'} />
          <Info label="Tierarzt-Telefon" value={card.vetPhone ?? 'Nicht angegeben'} />
          <Info label="Versicherung" value={card.insurancePolicy ?? 'Nicht angegeben'} />
        </View>
        <Text style={[styles.notes, { color: c.onSurface }]}>
          {card.specialNeeds ?? 'Keine besonderen Hinweise hinterlegt.'}
        </Text>
      </Card>
      {phoneUrl(card.vetPhone) ? (
        <ActionButton
          title="Tierarzt direkt anrufen"
          onPress={() => void Linking.openURL(phoneUrl(card.vetPhone) as string)}
        />
      ) : null}
      <ActionButton title="Zurück" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const c = usePalette();
  return (
    <View style={styles.info}>
      <Text style={[styles.label, { color: c.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.value, { color: c.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { paddingBottom: 40 },
  hero: { alignItems: 'center', borderRadius: 18, padding: 24, marginBottom: 22 },
  emoji: { fontSize: 58 },
  heroImage: { width: 100, height: 100, borderRadius: 50 },
  name: { fontFamily: appFonts.extrabold, fontSize: 25, marginTop: 8 },
  species: { fontFamily: appFonts.semibold, fontSize: 14, marginTop: 3 },
  grid: { gap: 14 },
  info: { borderBottomWidth: 1, borderBottomColor: '#dec0b744', paddingBottom: 10 },
  label: { fontFamily: appFonts.semibold, fontSize: 12 },
  value: { fontFamily: appFonts.bold, fontSize: 15, marginTop: 3 },
  notes: { fontFamily: appFonts.regular, fontSize: 15, lineHeight: 23 },
  offlineBanner: {
    borderRadius: 12,
    fontFamily: appFonts.semibold,
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
    marginBottom: 18,
  },
  disclaimer: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 14 },
});
