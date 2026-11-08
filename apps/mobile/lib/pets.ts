export function petSpeciesEmoji(species: string | null | undefined): string {
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
    case 'horse':
      return '🐴';
    case 'amphibian':
      return '🐸';
    case 'fish':
      return '🐠';
    default:
      return '🐾';
  }
}
