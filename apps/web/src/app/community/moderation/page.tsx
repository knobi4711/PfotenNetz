'use client';

import {
  EVENT_TYPE_LABELS,
  useCommunityModerationEvents,
  useModerateCommunityEvent,
  useOwnProfile,
} from '@pfotennetz/supabase';
import { WebHeader } from '../../../components/WebHeader';

export default function CommunityModerationPage() {
  const profile = useOwnProfile();
  const events = useCommunityModerationEvents();
  const moderate = useModerateCommunityEvent();

  if (profile.isPending) {
    return <p className="p-10">Berechtigungen werden geprüft …</p>;
  }

  if (profile.data?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-surface">
        <WebHeader backHref="/community" backLabel="Community" />
        <div className="mx-auto max-w-3xl px-6 py-10">
          <section className="card p-6">
            <h1 className="text-2xl font-extrabold">Kein Zugriff</h1>
            <p className="mt-2 text-on-surface-variant">
              Diese Ansicht ist nur für Community-Moderator:innen verfügbar.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/community" backLabel="Community" />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">Administration</p>
        <h1 className="mt-2 text-4xl font-extrabold">Community-Moderation</h1>
        <p className="mt-3 text-on-surface-variant">
          Prüfe neue Events, bevor sie in der öffentlichen Nachbarschaftsansicht erscheinen.
        </p>
        {events.isPending ? <p className="mt-8">Moderationsqueue wird geladen …</p> : null}
        {events.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Moderationsqueue konnte nicht geladen werden: {events.error.message}
          </p>
        ) : null}
        {events.data?.length ? (
          <div className="mt-8 grid gap-5">
            {events.data.map((event) => (
              <article key={event.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                      {EVENT_TYPE_LABELS[event.type]}
                    </span>
                    <h2 className="mt-4 text-xl font-extrabold">{event.title}</h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${event.is_public ? 'bg-success-container text-on-success-container' : 'bg-surface-container text-on-surface-variant'}`}
                  >
                    {event.is_public ? 'Öffentlich' : 'Ausgeblendet'}
                  </span>
                </div>
                {event.description ? (
                  <p className="mt-3 text-on-surface-variant">{event.description}</p>
                ) : null}
                <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-on-surface-variant">Beginn</dt>
                    <dd>{new Date(event.starts_at).toLocaleString('de-DE')}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-on-surface-variant">Ort</dt>
                    <dd>{event.address ?? 'Nicht angegeben'}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={event.is_public ? 'btn-secondary' : 'btn-primary'}
                    disabled={moderate.isPending}
                    onClick={() =>
                      moderate.mutate({ eventId: event.id, isPublic: !event.is_public })
                    }
                  >
                    {event.is_public ? 'Event ausblenden' : 'Event freigeben'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : !events.isPending && !events.isError ? (
          <section className="card mt-8 p-8 text-center text-on-surface-variant">
            Keine Community-Events in der Moderationsqueue.
          </section>
        ) : null}
      </div>
    </main>
  );
}
