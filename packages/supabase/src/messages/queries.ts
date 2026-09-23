import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Message = Database['public']['Tables']['messages']['Row'];

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

export async function fetchBookingMessages(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<Message[]> {
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendBookingMessage(
  client: SupabaseClient<Database>,
  bookingId: string,
  content: string
): Promise<Message> {
  const trimmed = content.trim();
  if (trimmed.length === 0) throw new Error('Bitte gib eine Nachricht ein.');
  if (trimmed.length > 2000)
    throw new Error('Nachrichten dürfen höchstens 2.000 Zeichen enthalten.');

  const senderId = await requireUserId(client);
  const { data, error } = await client
    .from('messages')
    .insert({ booking_id: bookingId, sender_id: senderId, type: 'text', content: trimmed })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
