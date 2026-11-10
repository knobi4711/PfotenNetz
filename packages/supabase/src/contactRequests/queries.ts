import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type ContactRequest = Database['public']['Tables']['contact_requests']['Row'];

export interface ContactRequestProfile {
  id: string;
  display_name: string;
}

export interface ContactRequestWithProfiles extends ContactRequest {
  requesterProfile: ContactRequestProfile | null;
  helperProfile: ContactRequestProfile | null;
}

const CONTACT_REQUEST_SELECT = [
  '*',
  'requesterProfile:profiles!contact_requests_requester_id_fkey(id,display_name)',
  'helperProfile:profiles!contact_requests_helper_id_fkey(id,display_name)',
].join(',');

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

function postgrestCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function errorMessage(error: unknown): string | null {
  // Supabase errors are Error instances, but plain objects/codes also reach the UI
  // (e.g. after a rejected request). Never fall back to "Unbekannter Fehler" when
  // the server sent something usable.
  if (typeof error === 'string' && error.trim() !== '') return error.trim();
  if (typeof error !== 'object' || error === null) return null;
  if ('message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') return message.trim();
  }
  return null;
}

export function contactRequestErrorMessage(error: unknown): string {
  const code = postgrestCode(error);
  if (code === '23505') {
    return 'Für diesen Helfer gibt es bereits eine offene Kennenlernanfrage.';
  }
  if (code === '42501') {
    return 'Diese Person kann derzeit keine Kennenlernanfragen empfangen.';
  }
  if (code === '23503') {
    return 'Dieses Profil existiert nicht mehr.';
  }
  return errorMessage(error) ?? 'Unbekannter Fehler.';
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
): Promise<ContactRequestWithProfiles[]> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from('contact_requests')
    .select(CONTACT_REQUEST_SELECT)
    .or(`requester_id.eq.${userId},helper_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ContactRequestWithProfiles[];
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
