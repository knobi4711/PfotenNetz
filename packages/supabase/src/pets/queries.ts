import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Pet = Database['public']['Tables']['pets']['Row'];

export const PET_SPECIES_OPTIONS = ['dog', 'cat', 'rabbit', 'guinea_pig', 'bird', 'other'] as const;
export type PetSpecies = (typeof PET_SPECIES_OPTIONS)[number];

export const PET_SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: 'Hund',
  cat: 'Katze',
  rabbit: 'Kaninchen',
  guinea_pig: 'Meerschweinchen',
  bird: 'Vogel',
  other: 'Sonstiges',
};

export interface CreatePetInput {
  name: string;
  species: PetSpecies;
  breed: string | null;
  color: string | null;
  specialNeeds: string | null;
  birthDate: string | null;
}

export interface UpdatePetInput extends CreatePetInput {
  petId: string;
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

export function validateCreatePet(input: CreatePetInput): string | null {
  if (input.name.trim().length < 2) {
    return 'Bitte gib einen Namen mit mindestens zwei Zeichen ein.';
  }
  if (input.birthDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
    return 'Bitte gib ein gültiges Geburtsdatum ein.';
  }
  return null;
}

function toInsertRow(ownerId: string, input: CreatePetInput) {
  return {
    owner_id: ownerId,
    name: input.name.trim(),
    species: input.species,
    breed: input.breed === null || input.breed.trim() === '' ? null : input.breed.trim(),
    color: input.color === null || input.color.trim() === '' ? null : input.color.trim(),
    special_needs:
      input.specialNeeds === null || input.specialNeeds.trim() === ''
        ? null
        : input.specialNeeds.trim(),
    birth_date: input.birthDate,
  };
}

/** Loads the caller's own pets, newest first (RLS: owners only). */
export async function fetchOwnPets(client: SupabaseClient<Database>): Promise<Pet[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('pets')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (pet) => {
      if (!pet.avatar_url) return pet;
      const signed = await client.storage.from('pet-photos').createSignedUrl(pet.avatar_url, 3600);
      return signed.error === null ? { ...pet, avatar_url: signed.data.signedUrl } : pet;
    })
  );
}

/** Creates a pet for the caller. */
export async function createPet(
  client: SupabaseClient<Database>,
  input: CreatePetInput
): Promise<Pet> {
  const validationError = validateCreatePet(input);
  if (validationError !== null) throw new Error(validationError);

  const ownerId = await requireUserId(client);
  const { data, error } = await client
    .from('pets')
    .insert(toInsertRow(ownerId, input))
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Updates one of the caller's own pets. */
export async function updatePet(
  client: SupabaseClient<Database>,
  input: UpdatePetInput
): Promise<Pet> {
  const validationError = validateCreatePet(input);
  if (validationError !== null) throw new Error(validationError);

  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('pets')
    .update({
      name: input.name.trim(),
      species: input.species,
      breed: input.breed === null || input.breed.trim() === '' ? null : input.breed.trim(),
      color: input.color === null || input.color.trim() === '' ? null : input.color.trim(),
      special_needs:
        input.specialNeeds === null || input.specialNeeds.trim() === ''
          ? null
          : input.specialNeeds.trim(),
      birth_date: input.birthDate,
    })
    .eq('id', input.petId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Uploads or replaces the caller's pet photo and stores its private path. */
export async function uploadPetPhoto(
  client: SupabaseClient<Database>,
  petId: string,
  uri: string,
  contentType = 'image/jpeg'
): Promise<Pet> {
  const userId = await requireUserId(client);
  const { data: pet, error: petError } = await client
    .from('pets')
    .select('id')
    .eq('id', petId)
    .eq('owner_id', userId)
    .single();
  if (petError) throw petError;

  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `${userId}/${pet.id}/avatar.jpg`;
  const upload = await client.storage.from('pet-photos').upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (upload.error) throw upload.error;

  const { data, error } = await client
    .from('pets')
    .update({ avatar_url: path })
    .eq('id', petId)
    .eq('owner_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Activates or deactivates one of the caller's own pets. */
export async function setPetActive(
  client: SupabaseClient<Database>,
  petId: string,
  isActive: boolean
): Promise<Pet> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('pets')
    .update({ is_active: isActive })
    .eq('id', petId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Marks one of the caller's own pets as deceased or living. */
export async function setPetDeceased(
  client: SupabaseClient<Database>,
  petId: string,
  isDeceased: boolean
): Promise<Pet> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('pets')
    .update({ is_deceased: isDeceased, is_active: isDeceased ? false : true })
    .eq('id', petId)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
