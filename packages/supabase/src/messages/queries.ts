import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageWithMedia = Message & { mediaUrl: string | null };

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
): Promise<MessageWithMedia[]> {
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (message) => {
      const metadata = message.metadata;
      const path =
        typeof metadata === 'object' &&
        metadata !== null &&
        !Array.isArray(metadata) &&
        typeof metadata['path'] === 'string'
          ? metadata['path']
          : null;
      if (path === null) return { ...message, mediaUrl: null };
      const signed = await client.storage.from('booking-chat-media').createSignedUrl(path, 60 * 60);
      return { ...message, mediaUrl: signed.data?.signedUrl ?? null };
    })
  );
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

export async function uploadBookingMessageImage(
  client: SupabaseClient<Database>,
  bookingId: string,
  fileData: ArrayBuffer,
  contentType = 'image/jpeg'
): Promise<Message> {
  const senderId = await requireUserId(client);
  const path = `${bookingId}/${senderId}/image-${Date.now()}.jpg`;
  const upload = await client.storage.from('booking-chat-media').upload(path, fileData, {
    contentType,
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const { data, error } = await client
    .from('messages')
    .insert({
      booking_id: bookingId,
      sender_id: senderId,
      type: 'image',
      content: 'Foto',
      metadata: { path, contentType },
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadBookingMessageVoice(
  client: SupabaseClient<Database>,
  bookingId: string,
  fileData: ArrayBuffer,
  contentType = 'audio/mp4'
): Promise<Message> {
  const senderId = await requireUserId(client);
  const extension = contentType.includes('webm') ? 'webm' : 'm4a';
  const path = `${bookingId}/${senderId}/voice-${Date.now()}.${extension}`;
  const upload = await client.storage.from('booking-chat-media').upload(path, fileData, {
    contentType,
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const { data, error } = await client
    .from('messages')
    .insert({
      booking_id: bookingId,
      sender_id: senderId,
      type: 'voice',
      content: 'Sprachnachricht',
      metadata: { path, contentType },
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
