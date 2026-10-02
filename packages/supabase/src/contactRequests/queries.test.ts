import { describe, expect, it } from 'vitest';
import { contactRequestErrorMessage, validateContactRequest } from './queries';

describe('contact requests', () => {
  it('requires a helper and a message', () => {
    expect(validateContactRequest({ helperId: '', message: 'Hallo' })).toContain('Helper-ID');
    expect(validateContactRequest({ helperId: 'helper-1', message: ' ' })).toContain('Nachricht');
  });

  it('limits messages to the documented size', () => {
    expect(validateContactRequest({ helperId: 'helper-1', message: 'x'.repeat(1001) })).toContain(
      '1.000'
    );
    expect(validateContactRequest({ helperId: 'helper-1', message: 'Hallo' })).toBeNull();
  });

  it('explains duplicate pending requests', () => {
    expect(contactRequestErrorMessage({ code: '23505' })).toContain('bereits');
    expect(contactRequestErrorMessage(new Error('Netzwerkfehler'))).toBe('Netzwerkfehler');
  });
});
