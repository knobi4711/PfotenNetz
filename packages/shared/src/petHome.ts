/**
 * Human label for the place where the caller's pets live.
 *
 * One pet: `Bello-Zuhause`, two pets: `Bello's und Luna's-Zuhause`.
 * Without pets or with three and more pets the generic `Tier-Zuhause` is used,
 * because a list of names would not fit into headings, buttons and map popups.
 */
export interface PetHomePet {
  name: string;
  /** Inactive pets do not shape the label. */
  is_active?: boolean | null;
  /** Deceased pets never shape the label. */
  is_deceased?: boolean | null;
}

export const GENERIC_PET_HOME_LABEL = 'Tier-Zuhause';

export function petHomeLabel(pets: readonly PetHomePet[]): string {
  const names = pets
    .filter((pet) => pet.is_active !== false && pet.is_deceased !== true)
    .map((pet) => pet.name.trim())
    .filter((name) => name.length > 0);

  if (names.length === 1) return `${names[0]}-Zuhause`;
  if (names.length === 2) return `${names[0]}'s und ${names[1]}'s-Zuhause`;
  return GENERIC_PET_HOME_LABEL;
}
