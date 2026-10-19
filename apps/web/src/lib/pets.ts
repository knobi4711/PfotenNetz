import { PET_SPECIES_LABELS, type PetSpecies } from '@pfotennetz/supabase';

export function petSpeciesEmoji(species: string): string {
  switch (species) {
    case 'dog':
      return '🐶';
    case 'cat':
      return '🐱';
    case 'rabbit':
      return '🐰';
    case 'guinea_pig':
      return '🐹';
    case 'bird':
      return '🐦';
    default:
      return '🐾';
  }
}

export function formatPetDisplayName(
  pet: { name: string; species: string } | null | undefined
): string {
  if (!pet) return 'Tier';
  const species = PET_SPECIES_LABELS[pet.species as PetSpecies] ?? 'Tier';
  return pet.name.trim() ? `${species} ${pet.name.trim()}` : species;
}
