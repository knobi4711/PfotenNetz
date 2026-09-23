import { describe, expect, it, vi } from 'vitest';
import * as ExpoModulesCore from 'expo-modules-core';

// Simulate Expo Go / stale dev build: no native passkeys module present.
vi.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: vi.fn(() => null),
}));

describe('passkeys without native module (Expo Go / stale build)', () => {
  it('checks the native module first and never touches the throwing JS entry', async () => {
    const { isPasskeySupported } = await import('./passkeys');
    expect(() => isPasskeySupported()).not.toThrow();
    expect(isPasskeySupported()).toBe(false);
    expect(vi.mocked(ExpoModulesCore.requireOptionalNativeModule)).toHaveBeenCalledWith(
      'ReactNativePasskeys'
    );
  }, 15_000);

  it('sign-in points to a current development build', async () => {
    const { signInWithNativePasskey } = await import('./passkeys');
    await expect(signInWithNativePasskey()).rejects.toThrow('Development Build');
  });
});
