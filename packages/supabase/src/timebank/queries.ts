import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type TimebankAccount = Database['public']['Tables']['timebank_accounts']['Row'];
export type TimebankTransaction = Database['public']['Tables']['timebank_transactions']['Row'];

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

/**
 * Loads the caller's own timebank account.
 * A missing account (e.g. before the first settlement) is NOT an error:
 * it resolves to null so the UI can show a zero balance.
 */
export async function fetchOwnTimebankAccount(
  client: SupabaseClient<Database>
): Promise<TimebankAccount | null> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('timebank_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Loads the caller's own transactions, newest first. Read-only;
 * the ledger is append-only and changes only server-side.
 */
export async function fetchOwnTimebankTransactions(
  client: SupabaseClient<Database>
): Promise<TimebankTransaction[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('timebank_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
