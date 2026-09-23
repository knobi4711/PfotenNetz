import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PET_SPECIES_LABELS,
  PET_SPECIES_OPTIONS,
  useCreatePet,
  useOwnPets,
  useSetPetDeceased,
  useSetPetActive,
  useUpdatePet,
  type Pet,
  type PetSpecies,
} from '@pfotennetz/supabase';
import {
  ActionButton,
  AppHeader,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';

function PetCard({ pet, onEdit }: { pet: Pet; onEdit: (pet: Pet) => void }) {
  const c = usePalette();
  const setActive = useSetPetActive();
  const setDeceased = useSetPetDeceased();
  const speciesLabel =
    (PET_SPECIES_OPTIONS as readonly string[]).includes(pet.species) &&
    pet.species in PET_SPECIES_LABELS
      ? PET_SPECIES_LABELS[pet.species as PetSpecies]
      : pet.species;

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pet.name} bearbeiten`}
        onPress={() => onEdit(pet)}
        style={styles.petHeader}
      >
        <View style={[styles.petAvatar, { backgroundColor: c.primaryFixed }]}>
          <Text style={styles.petAvatarEmoji}>{pet.species === 'cat' ? '🐱' : '🐶'}</Text>
        </View>
        <View style={styles.petHeaderMain}>
          <Text style={[styles.petName, { color: c.onSurface }]}>{pet.name}</Text>
          <Text style={[styles.petSpecies, { color: c.onSurfaceVariant }]}>
            {speciesLabel}
            {pet.is_deceased ? ' · verstorben' : pet.is_active ? '' : ' · pausiert'}
          </Text>
        </View>
      </Pressable>
      {pet.breed !== null ? <InfoRow label="Rasse" value={pet.breed} /> : null}
      {pet.color !== null ? <InfoRow label="Farbe" value={pet.color} /> : null}
      {pet.special_needs !== null ? <InfoRow label="Besonderes" value={pet.special_needs} /> : null}
      {setActive.isError ? (
        <ErrorBox message={`Status konnte nicht geändert werden: ${setActive.error.message}`} />
      ) : null}
      <ActionButton
        title={pet.is_deceased ? 'Verstorben' : pet.is_active ? 'Pausieren' : 'Reaktivieren'}
        variant="secondary"
        disabled={pet.is_deceased}
        pending={setActive.isPending}
        onPress={() => {
          setActive.mutate({ petId: pet.id, isActive: !pet.is_active });
        }}
      />
      <View style={styles.deceasedRow}>
        <View style={styles.deceasedLabel}>
          <Text style={[styles.deceasedTitle, { color: c.onSurface }]}>Verstorben</Text>
          <Text style={[styles.deceasedHint, { color: c.onSurfaceVariant }]}>
            Nicht mehr für Aufträge verfügbar
          </Text>
        </View>
        <Switch
          accessibilityLabel={`${pet.name} als verstorben markieren`}
          disabled={setDeceased.isPending}
          onValueChange={(value) => {
            setDeceased.mutate({ petId: pet.id, isDeceased: value });
          }}
          thumbColor={pet.is_deceased ? c.primary : c.surfaceContainerLowest}
          trackColor={{ false: c.outlineVariant, true: c.primaryFixed }}
          value={pet.is_deceased}
        />
      </View>
      {setDeceased.isError ? (
        <ErrorBox message={`Status konnte nicht geändert werden: ${setDeceased.error.message}`} />
      ) : null}
    </Card>
  );
}

export default function PetsScreen() {
  const c = usePalette();
  const petsQuery = useOwnPets();
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();

  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies>('dog');
  const [breed, setBreed] = useState('');
  const [color, setColor] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [formHint, setFormHint] = useState<string | null>(null);

  const pets = petsQuery.data ?? [];
  const pending = createPet.isPending || updatePet.isPending;

  const openEditForm = (pet: Pet) => {
    setEditingPet(pet);
    setName(pet.name);
    setSpecies(pet.species as PetSpecies);
    setBreed(pet.breed ?? '');
    setColor(pet.color ?? '');
    setSpecialNeeds(pet.special_needs ?? '');
    setFormHint(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPet(null);
    setName('');
    setBreed('');
    setColor('');
    setSpecialNeeds('');
    setFormHint(null);
  };

  const handleCreate = () => {
    if (name.trim().length < 2) {
      setFormHint('Bitte gib einen Namen mit mindestens zwei Zeichen ein.');
      return;
    }
    setFormHint(null);
    const input = {
      name: name.trim(),
      species,
      breed: breed.trim() === '' ? null : breed.trim(),
      color: color.trim() === '' ? null : color.trim(),
      specialNeeds: specialNeeds.trim() === '' ? null : specialNeeds.trim(),
    };
    if (editingPet === null) {
      createPet.mutate(input, { onSuccess: closeForm });
    } else {
      updatePet.mutate({ ...input, petId: editingPet.id }, { onSuccess: closeForm });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppHeader title="Meine Haustiere" subtitle="Profile, Bedürfnisse und Betreuungsstatus." />

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
              pets.map((pet) => <PetCard key={pet.id} pet={pet} onEdit={openEditForm} />)
            )}

            {showForm ? (
              <Card>
                <SectionTitle>
                  {editingPet === null ? 'Neues Tier' : 'Tier bearbeiten'}
                </SectionTitle>
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
                {createPet.isError || updatePet.isError ? (
                  <ErrorBox
                    message={`Speichern fehlgeschlagen: ${(createPet.error ?? updatePet.error)?.message ?? 'Unbekannter Fehler'}`}
                  />
                ) : null}
                <ActionButton
                  title={editingPet === null ? 'Tier speichern' : 'Änderungen speichern'}
                  pending={pending}
                  onPress={handleCreate}
                />
                <ActionButton
                  title="Abbrechen"
                  variant="secondary"
                  disabled={pending}
                  onPress={() => {
                    closeForm();
                  }}
                />
              </Card>
            ) : (
              <ActionButton
                title="Tier hinzufügen"
                onPress={() => {
                  setEditingPet(null);
                  setName('');
                  setSpecies('dog');
                  setBreed('');
                  setColor('');
                  setSpecialNeeds('');
                  setFormHint(null);
                  setShowForm(true);
                }}
              />
            )}

            <ActionButton
              title="Daten aktualisieren"
              variant="secondary"
              pending={petsQuery.isFetching}
              disabled={petsQuery.isFetching}
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
  content: { padding: 16, paddingBottom: 40 },
  label: {
    fontFamily: appFonts.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: appFonts.regular,
    fontSize: 15,
  },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  hint: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  petHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  petAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAvatarEmoji: { fontSize: 28 },
  petHeaderMain: { flex: 1 },
  petName: { fontFamily: appFonts.extrabold, fontSize: 18, lineHeight: 24 },
  petSpecies: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  deceasedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dec0b744',
  },
  deceasedLabel: { flex: 1 },
  deceasedTitle: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  deceasedHint: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16, marginTop: 2 },
});
