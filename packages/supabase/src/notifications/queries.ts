import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationType = Database['public']['Enums']['notification_type'];

export const NOTIFICATION_LIMIT = 50;

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) throw new Error('Not authenticated');
  return user.id;
}

/** Own notifications, newest first. */
export async function fetchOwnNotifications(
  client: SupabaseClient<Database>,
  limit: number = NOTIFICATION_LIMIT
): Promise<Notification[]> {
  const userId = await requireUserId(client);
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : NOTIFICATION_LIMIT;
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return data ?? [];
}

/** Number of unread notifications for the caller. */
export async function fetchUnreadCount(client: SupabaseClient<Database>): Promise<number> {
  const userId = await requireUserId(client);
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

/** Marks one own notification as read. */
export async function markNotificationRead(
  client: SupabaseClient<Database>,
  notificationId: string
): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

/** Marks all own unread notifications as read. */
export async function markAllNotificationsRead(client: SupabaseClient<Database>): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

export function notificationDeepLink(notification: Pick<Notification, 'data'>): string | null {
  const data = notification.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const url = (data as Record<string, unknown>)['url'];
  return typeof url === 'string' && url.startsWith('/') ? url : null;
}

/**
 * Subscribes to the caller's notification rows (INSERT + UPDATE).
 * Returns an unsubscribe function. The caller invalidates its queries
 * inside onEvent; no payload parsing happens here.
 */
export function subscribeNotifications(
  client: SupabaseClient<Database>,
  userId: string,
  onEvent: () => void
): () => void {
  const channel: RealtimeChannel = client
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onEvent();
      }
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
