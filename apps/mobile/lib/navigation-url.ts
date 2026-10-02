export function buildDirectionsUrl(destination: string): string | null {
  const trimmed = destination.trim();
  if (trimmed.length === 0) return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trimmed)}`;
}
