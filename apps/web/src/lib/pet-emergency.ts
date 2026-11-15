/** Display helpers shared by the emergency card views. */

export function calculatePetAge(birthDate: string | null): string {
  if (!birthDate) return 'Nicht angegeben';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 'Nicht angegeben';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? `${age} Jahre` : 'Nicht angegeben';
}

export function formatEmergencyList(value: unknown): string {
  if (!Array.isArray(value)) return 'Keine Angaben';
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  );
  return items.length > 0 ? items.join(', ') : 'Keine Angaben';
}
