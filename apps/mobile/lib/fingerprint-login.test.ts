import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

vi.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  supportedAuthenticationTypesAsync: vi.fn(),
  authenticateAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

const hasHardware = vi.mocked(LocalAuthentication.hasHardwareAsync);
const isEnrolled = vi.mocked(LocalAuthentication.isEnrolledAsync);
const supportedTypes = vi.mocked(LocalAuthentication.supportedAuthenticationTypesAsync);
const authenticate = vi.mocked(LocalAuthentication.authenticateAsync);
const getItem = vi.mocked(SecureStore.getItemAsync);
const setItem = vi.mocked(SecureStore.setItemAsync);
const deleteItem = vi.mocked(SecureStore.deleteItemAsync);

import {
  authenticateWithFingerprint,
  clearStoredCredentials,
  FingerprintCancelledError,
  friendlyFingerprintError,
  getFingerprintCapabilities,
  hasStoredCredentials,
  signInWithFingerprint,
  storeCredentials,
} from './fingerprint-login';

beforeEach(() => {
  vi.resetAllMocks();
  hasHardware.mockResolvedValue(true);
  isEnrolled.mockResolvedValue(true);
  supportedTypes.mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
});

describe('getFingerprintCapabilities', () => {
  it('is available with fingerprint hardware and enrollment', async () => {
    await expect(getFingerprintCapabilities()).resolves.toEqual({
      available: true,
      enrolled: true,
    });
  });

  it('is unavailable without fingerprint hardware type', async () => {
    supportedTypes.mockResolvedValue([LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]);
    await expect(getFingerprintCapabilities()).resolves.toEqual({
      available: false,
      enrolled: true,
    });
  });

  it('reports missing enrollment', async () => {
    isEnrolled.mockResolvedValue(false);
    await expect(getFingerprintCapabilities()).resolves.toEqual({
      available: true,
      enrolled: false,
    });
  });

  it('is unavailable when the native call throws', async () => {
    hasHardware.mockRejectedValue(new Error('no native module'));
    await expect(getFingerprintCapabilities()).resolves.toEqual({
      available: false,
      enrolled: false,
    });
  });
});

describe('stored credentials', () => {
  it('stores email and password under namespaced keys', async () => {
    await storeCredentials('a@b.de', 'secret');
    expect(setItem).toHaveBeenCalledWith('pfotennetz.biometric.email', 'a@b.de');
    expect(setItem).toHaveBeenCalledWith('pfotennetz.biometric.password', 'secret');
  });

  it('clears both keys', async () => {
    await clearStoredCredentials();
    expect(deleteItem).toHaveBeenCalledWith('pfotennetz.biometric.email');
    expect(deleteItem).toHaveBeenCalledWith('pfotennetz.biometric.password');
  });

  it('detects complete credentials', async () => {
    getItem.mockImplementation((key: string) =>
      Promise.resolve(key.endsWith('email') ? 'a@b.de' : 'secret')
    );
    await expect(hasStoredCredentials()).resolves.toBe(true);
  });

  it('detects missing credentials', async () => {
    getItem.mockResolvedValue(null);
    await expect(hasStoredCredentials()).resolves.toBe(false);
  });
});

describe('authenticateWithFingerprint', () => {
  it('resolves on successful scan', async () => {
    authenticate.mockResolvedValue({ success: true });
    await expect(authenticateWithFingerprint()).resolves.toBeUndefined();
  });

  it('throws FingerprintCancelledError on user cancel', async () => {
    authenticate.mockResolvedValue({ success: false, error: 'user_cancel' });
    await expect(authenticateWithFingerprint()).rejects.toBeInstanceOf(FingerprintCancelledError);
  });

  it('throws a lockout message after too many attempts', async () => {
    authenticate.mockResolvedValue({ success: false, error: 'lockout' });
    await expect(authenticateWithFingerprint()).rejects.toThrow('vorübergehend gesperrt');
  });
});

describe('signInWithFingerprint', () => {
  it('authenticates and signs in with stored credentials', async () => {
    authenticate.mockResolvedValue({ success: true });
    getItem.mockImplementation((key: string) =>
      Promise.resolve(key.endsWith('email') ? 'a@b.de' : 'secret')
    );
    const signIn = vi.fn().mockResolvedValue(undefined);
    await signInWithFingerprint(signIn);
    expect(authenticate).toHaveBeenCalledOnce();
    expect(signIn).toHaveBeenCalledWith('a@b.de', 'secret');
  });

  it('does not sign in without stored credentials', async () => {
    authenticate.mockResolvedValue({ success: true });
    getItem.mockResolvedValue(null);
    const signIn = vi.fn();
    await expect(signInWithFingerprint(signIn)).rejects.toThrow('Keine gespeicherten Zugangsdaten');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('does not read credentials after cancel', async () => {
    authenticate.mockResolvedValue({ success: false, error: 'user_cancel' });
    const signIn = vi.fn();
    await expect(signInWithFingerprint(signIn)).rejects.toBeInstanceOf(FingerprintCancelledError);
    expect(getItem).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe('friendlyFingerprintError', () => {
  it('passes cancel messages through', () => {
    expect(friendlyFingerprintError(new FingerprintCancelledError())).toBe(
      'Die Fingerabdruck-Anfrage wurde abgebrochen.'
    );
  });

  it('prefixes technical errors', () => {
    expect(friendlyFingerprintError(new Error('network down'))).toBe(
      'Anmeldung mit Fingerabdruck fehlgeschlagen: network down'
    );
  });
});
