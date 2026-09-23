import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getSupabaseClient } from '../client/createClient';
import { getUser } from '../client/createClient';
import { notificationKeys } from './keys';
import {
  fetchOwnNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
  type Notification,
} from './queries';

export function useNotifications(): UseQueryResult<Notification[], Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => fetchOwnNotifications(client),
  });
}

export function useUnreadCount(): UseQueryResult<number, Error> {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => fetchUnreadCount(client),
  });
}

/** Realtime subscription: invalidates notification queries on any own row event. */
export function useNotificationSubscription(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const user = await getUser();
      if (cancelled || user === null) return;
      const client = getSupabaseClient();
      unsubscribe = subscribeNotifications(client, user.id, () => {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      });
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [queryClient]);
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };
}

export function useMarkNotificationRead() {
  const client = getSupabaseClient();
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(client, notificationId),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const client = getSupabaseClient();
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(client),
    onSuccess: invalidate,
  });
}
