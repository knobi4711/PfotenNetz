import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type ContactRequest = Database['public']['Tables']['contact_requests']['Row'];

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export interface CreateContactRequestInput {
  helperId: string;
  message: string;
}

export function contactRequestErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    return 'Für diesen Helfer gibt es bereits eine offene Kennenlernanfrage.';
  }
  return error instanceof Error ? error.message : 'Unbekannter Fehler.';
}

export function validateContactRequest(input: CreateContactRequestInput): string | null {
  if (input.helperId.trim() === '') return 'Helper-ID fehlt.';
  const message = input.message.trim();
  if (message.length < 1) return 'Bitte schreibe eine kurze Nachricht.';
  if (message.length > 1000) return 'Die Nachricht darf höchstens 1.000 Zeichen enthalten.';
  return null;
}

export async function createContactRequest(
  client: SupabaseClient<Database>,
  input: CreateContactRequestInput
): Promise<ContactRequest> {
  const validationError = validateContactRequest(input);
  if (validationError !== null) throw new Error(validationError);
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('contact_requests')
    .insert({
      requester_id: userId,
      helper_id: input.helperId,
      message: input.message.trim(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOwnContactRequests(
  client: SupabaseClient<Database>
): Promise<ContactRequest[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('contact_requests')
    .select('*')
    .or(`requester_id.eq.${userId},helper_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function respondContactRequest(
  client: SupabaseClient<Database>,
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<ContactRequest> {
  const { data, error } = await client.rpc('respond_contact_request', {
    p_request_id: requestId,
    p_status: status,
  });
  if (error) throw error;
  return data as ContactRequest;
}

export async function cancelContactRequest(
  client: SupabaseClient<Database>,
  requestId: string
): Promise<ContactRequest> {
  const { data, error } = await client.rpc('cancel_contact_request', { p_request_id: requestId });
  if (error) throw error;
  return data as ContactRequest;
}
