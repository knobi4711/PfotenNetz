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

  it('keeps server messages from plain postgrest-like errors', () => {
    expect(contactRequestErrorMessage({ code: '23514', message: 'check constraint failed' })).toBe(
      'check constraint failed'
    );
    expect(contactRequestErrorMessage({ message: 'permission denied' })).toBe('permission denied');
  });

  it('explains blocked and missing recipients', () => {
    expect(contactRequestErrorMessage({ code: '42501', message: 'rls' })).toContain('derzeit');
    expect(contactRequestErrorMessage({ code: '23503', message: 'fk' })).toContain('existiert');
  });

  it('only answers "Unbekannter Fehler." when nothing usable is left', () => {
    expect(contactRequestErrorMessage(null)).toBe('Unbekannter Fehler.');
    expect(contactRequestErrorMessage({ message: '   ' })).toBe('Unbekannter Fehler.');
  });
});
