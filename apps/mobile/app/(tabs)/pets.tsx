import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PET_SPECIES_LABELS,
  PET_SPECIES_OPTIONS,
  useCreatePet,
  useOwnPets,
  useSetPetActive,
  type Pet,
  type PetSpecies,
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
} from '../../components/ui';

function PetCard({ pet }: { pet: Pet }) {
  const c = usePalette();
  const setActive = useSetPetActive();
  const speciesLabel =
    (PET_SPECIES_OPTIONS as readonly string[]).includes(pet.species) &&
    pet.species in PET_SPECIES_LABELS
      ? PET_SPECIES_LABELS[pet.species as PetSpecies]
      : pet.species;

  return (
    <Card>
      <View style={styles.petHeader}>
        <Text style={[styles.petName, { color: c.onSurface }]}>{pet.name}</Text>
        <Text style={[styles.petSpecies, { color: c.onSurfaceVariant }]}>
          {speciesLabel}
          {pet.is_active ? '' : ' · pausiert'}
        </Text>
      </View>
      {pet.breed !== null ? <InfoRow label="Rasse" value={pet.breed} /> : null}
      {pet.color !== null ? <InfoRow label="Farbe" value={pet.color} /> : null}
      {pet.special_needs !== null ? <InfoRow label="Besonderes" value={pet.special_needs} /> : null}
      {setActive.isError ? (
        <ErrorBox message={`Status konnte nicht geändert werden: ${setActive.error.message}`} />
      ) : null}
      <ActionButton
        title={pet.is_active ? 'Pausieren' : 'Reaktivieren'}
        variant="secondary"
        pending={setActive.isPending}
        onPress={() => {
          setActive.mutate({ petId: pet.id, isActive: !pet.is_active });
        }}
      />
    </Card>
  );
}

export default function PetsScreen() {
  const c = usePalette();
  const petsQuery = useOwnPets();
  const createPet = useCreatePet();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies>('dog');
  const [breed, setBreed] = useState('');
  const [color, setColor] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [formHint, setFormHint] = useState<string | null>(null);

  const pets = petsQuery.data ?? [];
  const pending = createPet.isPending;

  const handleCreate = () => {
    if (name.trim().length < 2) {
      setFormHint('Bitte gib einen Namen mit mindestens zwei Zeichen ein.');
      return;
    }
    setFormHint(null);
    createPet.mutate(
      {
        name: name.trim(),
        species,
        breed: breed.trim() === '' ? null : breed.trim(),
        color: color.trim() === '' ? null : color.trim(),
        specialNeeds: specialNeeds.trim() === '' ? null : specialNeeds.trim(),
      },
      {
        onSuccess: () => {
          setName('');
          setBreed('');
          setColor('');
          setSpecialNeeds('');
          setShowForm(false);
        },
      }
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.onSurface }]}>Meine Tiere</Text>

        {petsQuery.isPending ? (
          <LoadingView label="Tiere werden geladen …" />
        ) : petsQuery.isError ? (
          <ErrorBox
            message={`Tiere konnten nicht geladen werden: ${petsQuery.error.message}`}
            onRetry={() => {
              void petsQuery.refetch();
            }}
          />
        ) : (
          <>
            {pets.length === 0 ? (
              <Card>
                <EmptyText>
                  Noch keine Tiere eingetragen. Lege dein erstes Tier an, um Buchungen anfragen zu
                  können.
                </EmptyText>
              </Card>
            ) : (
              pets.map((pet) => <PetCard key={pet.id} pet={pet} />)
            )}

            {showForm ? (
              <Card>
                <SectionTitle>Neues Tier</SectionTitle>
                <Text style={[styles.label, { color: c.onSurface }]}>Name</Text>
                <TextInput
                  autoCapitalize="words"
                  editable={!pending}
                  onChangeText={setName}
                  placeholder="z. B. Bella"
                  placeholderTextColor={c.outline}
                  style={[
                    styles.input,
                    {
                      backgroundColor: c.surfaceContainerLow,
                      borderColor: c.outlineVariant,
                      color: c.onSurface,
                    },
                  ]}
                  value={name}
                />
                <Text style={[styles.label, { color: c.onSurface }]}>Tierart</Text>
                <View style={styles.chipRow}>
                  {PET_SPECIES_OPTIONS.map((option) => {
                    const selected = option === species;
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={pending}
                        onPress={() => {
                          setSpecies(option);
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                            opacity: pending ? 0.6 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.chipText, { color: selected ? c.onPrimary : c.onSurface }]}
                        >
                          {PET_SPECIES_LABELS[option]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.label, { color: c.onSurface }]}>Rasse (optional)</Text>
                <TextInput
                  editable={!pending}
                  onChangeText={setBreed}
                  placeholder="z. B. Labrador"
                  placeholderTextColor={c.outline}
                  style={[
                    styles.input,
                    {
                      backgroundColor: c.surfaceContainerLow,
                      borderColor: c.outlineVariant,
                      color: c.onSurface,
                    },
                  ]}
                  value={breed}
                />
                <Text style={[styles.label, { color: c.onSurface }]}>Farbe (optional)</Text>
                <TextInput
                  editable={!pending}
                  onChangeText={setColor}
                  placeholder="z. B. Braun"
                  placeholderTextColor={c.outline}
                  style={[
                    styles.input,
                    {
                      backgroundColor: c.surfaceContainerLow,
                      borderColor: c.outlineVariant,
                      color: c.onSurface,
                    },
                  ]}
                  value={color}
                />
                <Text style={[styles.label, { color: c.onSurface }]}>Besonderes (optional)</Text>
                <TextInput
                  editable={!pending}
                  multiline
                  onChangeText={setSpecialNeeds}
                  onSubmitEditing={handleCreate}
                  placeholder="Medikamente, Allergien, Hinweise"
                  placeholderTextColor={c.outline}
                  style={[
                    styles.input,
                    styles.multiline,
                    {
                      backgroundColor: c.surfaceContainerLow,
                      borderColor: c.outlineVariant,
                      color: c.onSurface,
                    },
                  ]}
                  value={specialNeeds}
                />
                {formHint !== null ? (
                  <Text style={[styles.hint, { color: c.tertiary }]}>{formHint}</Text>
                ) : null}
                {createPet.isError ? (
                  <ErrorBox message={`Speichern fehlgeschlagen: ${createPet.error.message}`} />
                ) : null}
                <ActionButton title="Tier speichern" pending={pending} onPress={handleCreate} />
                <ActionButton
                  title="Abbrechen"
                  variant="secondary"
                  disabled={pending}
                  onPress={() => {
                    setShowForm(false);
                  }}
                />
              </Card>
            ) : (
              <ActionButton
                title="Tier hinzufügen"
                onPress={() => {
                  setShowForm(true);
                }}
              />
            )}

            <ActionButton
              title="Daten aktualisieren"
              variant="secondary"
              onPress={() => {
                void petsQuery.refetch();
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  hint: { fontSize: 14, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontSize: 14, fontWeight: '700' },
  petHeader: { marginBottom: 4 },
  petName: { fontSize: 18, fontWeight: '800' },
  petSpecies: { fontSize: 13, marginTop: 2 },
});
