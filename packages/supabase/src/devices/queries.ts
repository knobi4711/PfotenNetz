import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Device = Database['public']['Tables']['devices']['Row'];

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface RegisterDeviceInput {
  platform: DevicePlatform;
  pushToken: string;
  deviceName?: string | undefined;
  appVersion?: string | undefined;
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

export function validateRegisterDevice(input: RegisterDeviceInput): string | null {
  if (input.pushToken.trim() === '') return 'Push-Token fehlt.';
  if (input.pushToken.length > 512) return 'Push-Token ist ungültig.';
  return null;
}

/**
 * Registers (or refreshes) the caller's device for push delivery.
 * Keyed by the globally unique push token; a token never moves between users
 * because user_id is part of the upsert identity via the RLS WITH CHECK.
 */
export async function registerDevice(
  client: SupabaseClient<Database>,
  input: RegisterDeviceInput
): Promise<Device> {
  const validationError = validateRegisterDevice(input);
  if (validationError !== null) throw new Error(validationError);
  const userId = await requireUserId(client);
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('devices')
    .upsert(
      {
        user_id: userId,
        platform: input.platform,
        push_token: input.pushToken.trim(),
        push_token_updated_at: now,
        device_name: input.deviceName ?? null,
        app_version: input.appVersion ?? null,
        last_seen_at: now,
        is_active: true,
      },
      { onConflict: 'push_token' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
