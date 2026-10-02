'use client';

import {
  notificationDeepLink,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationSubscription,
  useNotifications,
} from '@pfotennetz/supabase';
import Link from 'next/link';
import { WebHeader } from '../../components/WebHeader';

export default function NotificationsPage() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  useNotificationSubscription();
  const data = notifications.data ?? [];

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Inbox</p>
            <h1 className="mt-2 text-4xl font-extrabold">Mitteilungen</h1>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={markAll.isPending || data.every((item) => item.read_at !== null)}
            onClick={() => markAll.mutate()}
          >
            Alle als gelesen markieren
          </button>
        </div>
        {notifications.isPending ? <p className="py-10">Mitteilungen werden geladen …</p> : null}
        {notifications.isError ? (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Mitteilungen konnten nicht geladen werden: {notifications.error.message}
          </p>
        ) : null}
        {!notifications.isPending && !notifications.isError && data.length === 0 ? (
          <section className="card mt-8 p-8 text-center text-on-surface-variant">
            Noch keine Mitteilungen vorhanden.
          </section>
        ) : (
          <div className="mt-8 space-y-3">
            {data.map((notification) => {
              const href = notificationDeepLink(notification);
              const content = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-extrabold">{notification.title}</h2>
                    <time className="shrink-0 text-xs text-on-surface-variant">
                      {new Date(notification.created_at).toLocaleString('de-DE')}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">{notification.body}</p>
                </>
              );
              return href ? (
                <Link
                  key={notification.id}
                  href={href}
                  onClick={() => {
                    if (notification.read_at === null) markRead.mutate(notification.id);
                  }}
                  className={`card block p-5 hover:bg-surface-container-low ${notification.read_at === null ? 'border-primary/50 bg-primary-fixed/20' : ''}`}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={notification.id}
                  type="button"
                  className={`card block w-full p-5 text-left ${notification.read_at === null ? 'border-primary/50 bg-primary-fixed/20' : ''}`}
                  onClick={() => {
                    if (notification.read_at === null) markRead.mutate(notification.id);
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
