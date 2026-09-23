import { Share, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PET_SPECIES_LABELS, useOwnPets, type PetSpecies } from '@pfotennetz/supabase';
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
  const pet = pets.data?.find((item) => item.id === petId) ?? null;

  if (pets.isPending) return <LoadingView label="Notfallkarte wird geladen …" />;
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

  const shareCard = () => {
    void Share.share({
      title: `Notfallkarte ${pet.name}`,
      message: `PfotenNetz Notfallkarte\n\nName: ${pet.name}\nTierart: ${PET_SPECIES_LABELS[pet.species as PetSpecies] ?? pet.species}\nAlter: ${calculateAge(pet.birth_date)}\nChipnummer: ${pet.microchip_number ?? 'Nicht angegeben'}\nMedikamente: ${jsonList(pet.medications)}\nAllergien: ${pet.allergies?.join(', ') || 'Keine Angaben'}\nTierarzt: ${pet.vet_clinic ?? 'Nicht angegeben'} · ${pet.vet_phone ?? 'Keine Telefonnummer'}\nBesonderes: ${pet.special_needs ?? 'Keine Angaben'}`,
    });
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
          <Text style={styles.emoji}>
            {pet.species === 'cat' ? '🐱' : pet.species === 'dog' ? '🐶' : '🐾'}
          </Text>
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
      <ActionButton title="Notfallkarte teilen" onPress={shareCard} />
      <ActionButton
        title="Tier bearbeiten"
        variant="secondary"
        onPress={() => router.replace('/(tabs)/pets')}
      />
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
  name: { fontFamily: appFonts.extrabold, fontSize: 25, marginTop: 8 },
  species: { fontFamily: appFonts.semibold, fontSize: 14, marginTop: 3 },
  grid: { gap: 14 },
  info: { borderBottomWidth: 1, borderBottomColor: '#dec0b744', paddingBottom: 10 },
  label: { fontFamily: appFonts.semibold, fontSize: 12 },
  value: { fontFamily: appFonts.bold, fontSize: 15, marginTop: 3 },
  notes: { fontFamily: appFonts.regular, fontSize: 15, lineHeight: 23 },
  disclaimer: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 14 },
});
