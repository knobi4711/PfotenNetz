import { describe, expect, it } from 'vitest';
import { isSessionMissingError } from './session';

describe('isSessionMissingError', () => {
  it('detects the missing-session error by name', () => {
    expect(
      isSessionMissingError({ name: 'AuthSessionMissingError', message: 'Auth session missing!' })
    ).toBe(true);
  });

  it('does not treat real auth errors as missing session', () => {
    expect(
      isSessionMissingError({ name: 'AuthApiError', message: 'Invalid login credentials' })
    ).toBe(false);
    expect(isSessionMissingError(new Error('network failure'))).toBe(false);
  });

  it('handles nullish and non-object values', () => {
    expect(isSessionMissingError(null)).toBe(false);
    expect(isSessionMissingError(undefined)).toBe(false);
    expect(isSessionMissingError('AuthSessionMissingError')).toBe(false);
  });
});
