import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Number of registered profiles.
 *
 * Counts run through `public.registered_user_count()`, because `public.profiles`
 * is protected by RLS and cannot be counted directly from the client. The
 * function returns an aggregate only, so it is safe for anon and authenticated
 * callers.
 */
export async function fetchRegisteredUserCount(client: SupabaseClient<Database>): Promise<number> {
  const { data, error } = await client.rpc('registered_user_count');
  if (error) throw error;
  return Number(data ?? 0);
}
