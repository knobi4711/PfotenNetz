import { describe, expect, it } from 'vitest';
import { friendlyPasskeyError, PasskeyCancelledError } from './passkey-errors';

describe('friendlyPasskeyError', () => {
  it('maps cancellation without exposing native details', () => {
    expect(friendlyPasskeyError(new PasskeyCancelledError())).toBe(
      'Die Passkey-Anfrage wurde abgebrochen.'
    );
  });

  it('maps missing credentials', () => {
    expect(friendlyPasskeyError(new Error('webauthn_credential_not_found'))).toBe(
      'Auf diesem Gerät wurde kein passender Passkey gefunden.'
    );
  });
});
