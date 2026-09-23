export class PasskeyCancelledError extends Error {
  constructor() {
    super('Die Passkey-Anfrage wurde abgebrochen.');
    this.name = 'PasskeyCancelledError';
  }
}

export function friendlyPasskeyError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
  const normalized = message.toLowerCase();
  if (normalized.includes('passkey_disabled')) {
    return 'Passkeys sind für dieses Projekt noch nicht aktiviert.';
  }
  if (normalized.includes('cancel') || normalized.includes('abgebrochen')) {
    return 'Die Passkey-Anfrage wurde abgebrochen.';
  }
  if (normalized.includes('credential_not_found') || normalized.includes('no credentials')) {
    return 'Auf diesem Gerät wurde kein passender Passkey gefunden.';
  }
  return `Passkey-Anmeldung fehlgeschlagen: ${message}`;
}
