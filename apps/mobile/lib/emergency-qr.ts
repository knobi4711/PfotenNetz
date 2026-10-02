const DEFAULT_ALLOWED_HOSTS = new Set(['pfotennetz.app', 'localhost', '127.0.0.1']);

function allowedHosts(): Set<string> {
  const hosts = new Set(DEFAULT_ALLOWED_HOSTS);
  const configured = process.env.EXPO_PUBLIC_WEB_URL;
  if (configured) {
    try {
      hosts.add(new URL(configured).hostname);
    } catch {
      // Invalid configuration is handled by rejecting the scanned URL.
    }
  }
  return hosts;
}

export function parseEmergencyCardUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (!allowedHosts().has(url.hostname)) return null;
    if (url.pathname.split('/').length !== 3 || url.pathname.split('/')[1] !== 'emergency') {
      return null;
    }
    const token = url.pathname.split('/')[2];
    if (!token) return null;
    if (!/^[A-Za-z0-9_-]{8,256}$/.test(token) || url.search || url.hash) return null;
    return `${url.origin}/emergency/${token}`;
  } catch {
    return null;
  }
}

export function parseEmergencyCardToken(value: string): string | null {
  const normalized = parseEmergencyCardUrl(value);
  return normalized?.split('/').pop() ?? null;
}
