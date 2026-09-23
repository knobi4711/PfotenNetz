// PfotenNetz Native Auth - Biometry & Secure Credential Storage
// Platform-specific implementations for iOS/Android
// Web implementations are in @pfotennetz/supabase/auth

import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometryCapabilities {
  available: boolean;
  type: 'face_id' | 'touch_id' | 'fingerprint' | 'none';
  enrolled: boolean;
}

export async function getBiometryCapabilities(): Promise<BiometryCapabilities> {
  if (typeof LocalAuthentication === 'undefined') {
    return { available: false, type: 'none', enrolled: false };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let type: BiometryCapabilities['type'] = 'none';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      type = 'face_id';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      type = 'fingerprint';
    }

    return { available: hasHardware, type, enrolled: isEnrolled };
  } catch {
    return { available: false, type: 'none', enrolled: false };
  }
}

export async function authenticateWithBiometry(promptMessage: string): Promise<boolean> {
  if (typeof LocalAuthentication === 'undefined') {
    throw new Error('Biometry not available');
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Passwort verwenden',
      cancelLabel: 'Abbrechen',
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometryForPasskey(): Promise<{
  success: boolean;
  error?: string;
}> {
  // This will be used for Passkey ceremony on native
  // Requires react-native-webauthn or expo-web-authn
  // Implementation pending PoC
  return { success: false, error: 'Native Passkey not yet implemented - PoC required' };
}
