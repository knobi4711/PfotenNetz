import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { PET_SPECIES_LABELS, type PetSpecies } from '@pfotennetz/supabase';
import { TASSO_PHONE_NUMBER, TASSO_PHONE_URL } from '@pfotennetz/shared';
import { ActionButton, Card, SectionTitle, appFonts, usePalette } from './ui';
import {
  calculatePetAge,
  formatEmergencyList,
  type PetEmergencyCardData,
} from '../lib/pet-emergency';
import { petSpeciesEmoji } from '../lib/pets';
import { phoneUrl } from '../lib/phone';

/**
 * Renders the emergency card of one pet. Shared by the owner view, the
 * offline fallback and the helper view inside a booking.
 */
export function PetEmergencyCard({
  card,
  offlineSavedAt,
}: {
  card: PetEmergencyCardData;
  offlineSavedAt?: string | null;
}) {
  const c = usePalette();
  const vetPhone = phoneUrl(card.vetPhone);

  return (
    <>
      {offlineSavedAt ? (
        <Card>
          <Text
            style={[
              styles.offlineBanner,
              { color: c.onErrorContainer, backgroundColor: c.errorContainer },
            ]}
          >
            Keine Internetverbindung. Zuletzt synchronisiert am{' '}
            {new Date(offlineSavedAt).toLocaleString('de-DE')}.
          </Text>
        </Card>
      ) : null}
      <Card>
        <View style={[styles.hero, { backgroundColor: c.primaryFixed }]}>
          {card.avatarUrl ? (
            <Image
              accessibilityLabel={`Foto von ${card.name}`}
              source={{ uri: card.avatarUrl }}
              style={styles.heroImage}
            />
          ) : (
            <Text style={styles.emoji}>{petSpeciesEmoji(card.species)}</Text>
          )}
          <Text style={[styles.name, { color: c.onPrimaryFixed }]}>{card.name}</Text>
          <Text style={[styles.species, { color: c.onPrimaryFixedVariant }]}>
            {PET_SPECIES_LABELS[card.species as PetSpecies] ?? card.species}
          </Text>
        </View>
        <SectionTitle>Steckbrief</SectionTitle>
        <View style={styles.grid}>
          <Info label="Alter" value={calculatePetAge(card.birthDate)} />
          <Info label="Rasse" value={card.breed ?? 'Nicht angegeben'} />
          {card.color !== null ? (
            <Info label="Farbe" value={card.color ?? 'Nicht angegeben'} />
          ) : null}
          {card.statusLabel !== null ? <Info label="Status" value={card.statusLabel} /> : null}
          <Info label="Chipnummer" value={card.microchipNumber ?? 'Nicht angegeben'} />
          <Info label="Tasso-Nummer" value={card.tassoNumber ?? 'Nicht angegeben'} />
          <Info label="Tasso-Telefon" value={TASSO_PHONE_NUMBER} />
        </View>
      </Card>
      <Card>
        <SectionTitle>Medizinische Hinweise</SectionTitle>
        <View style={styles.grid}>
          <Info label="Medikamente" value={formatEmergencyList(card.medications)} />
          <Info label="Allergien" value={card.allergies.join(', ') || 'Keine Angaben'} />
          <Info label="Tierarztpraxis" value={card.vetClinic ?? 'Nicht angegeben'} />
          <Info label="Tierarzt-Telefon" value={card.vetPhone ?? 'Nicht angegeben'} />
          <Info label="Versicherung" value={card.insurancePolicy ?? 'Nicht angegeben'} />
        </View>
        <Text style={[styles.notes, { color: c.onSurface }]}>
          {card.specialNeeds ?? 'Keine besonderen Hinweise hinterlegt.'}
        </Text>
      </Card>
      {vetPhone ? (
        <ActionButton
          title="Tierarzt direkt anrufen"
          onPress={() => void Linking.openURL(vetPhone)}
        />
      ) : null}
      {card.tassoNumber !== null ? (
        <ActionButton
          title="Tasso anrufen"
          variant="secondary"
          onPress={() => void Linking.openURL(TASSO_PHONE_URL)}
        />
      ) : null}
    </>
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
});
