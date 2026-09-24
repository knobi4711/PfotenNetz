export function phoneUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[+0-9][0-9 ()/.-]{5,}$/.test(trimmed)) return null;
  return `tel:${trimmed.replace(/[ ()/-]/g, '')}`;
}
