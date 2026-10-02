'use client';

import { useUnreadCount } from '@pfotennetz/supabase';
import Link from 'next/link';

export function NotificationBell() {
  const unread = useUnreadCount();
  const count = unread.data ?? 0;
  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `${count} ungelesene Mitteilungen` : 'Mitteilungen'}
      className="relative rounded-full border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container"
    >
      🔔
      {count > 0 ? (
        <span className="absolute -right-1 -top-2 min-w-5 rounded-full bg-error px-1.5 text-center text-xs leading-5 text-on-error">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
