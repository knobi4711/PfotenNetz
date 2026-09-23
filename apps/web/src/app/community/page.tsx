'use client';

import { getSupabaseClient } from '@pfotennetz/supabase';
import type { Database } from '@pfotennetz/supabase';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

type Event = Database['public']['Tables']['community_events']['Row'];
const labels: Record<string, string> = {
  group_walk: 'Rudelrunde',
  playdate: 'Playdate',
  meetup: 'Treffen',
  swap_meet: 'Tauschbörse',
  training: 'Training',
  other: 'Community-Event',
};

function useEvents() {
  const client = getSupabaseClient();
  return useQuery({
    queryKey: ['community-events', 'upcoming'],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await client
        .from('community_events')
        .select('*')
        .eq('is_public', true)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function CommunityPage() {
  const router = useRouter();
  const events = useEvents();
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xl font-extrabold text-on-surface"
          >
            🐾 PfotenNetz
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm font-bold text-primary"
          >
            ← Dashboard
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Community</p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">
          Nachbarschafts-Treff & Playdates
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
          Gemeinsam spazieren, austauschen und neue Menschen mit Tierliebe kennenlernen.
        </p>
        {events.isPending ? (
          <p className="py-12 text-center text-on-surface-variant">Events werden geladen …</p>
        ) : events.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Events konnten nicht geladen werden: {events.error.message}
          </p>
        ) : events.data?.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {events.data.map((event) => (
              <article key={event.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                    {labels[event.type] ?? event.type}
                  </span>
                  <span className="text-sm font-bold text-secondary">
                    {new Date(event.starts_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-extrabold text-on-surface">{event.title}</h2>
                {event.description ? (
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {event.description}
                  </p>
                ) : null}
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-20 font-bold text-on-surface-variant">Wann</dt>
                    <dd className="text-on-surface">
                      {new Date(event.starts_at).toLocaleString('de-DE')}
                    </dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-20 font-bold text-on-surface-variant">Wo</dt>
                    <dd className="text-on-surface">
                      {event.address ?? 'Ort in der Nachbarschaft'}
                    </dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-20 font-bold text-on-surface-variant">Zugang</dt>
                    <dd className="text-on-surface">Ab {event.required_trust_level} Trust-Level</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="btn-secondary mt-6 w-full"
                  onClick={() => router.push('/profile')}
                >
                  Teilnahme über Profil vormerken
                </button>
              </article>
            ))}
          </div>
        ) : (
          <section className="card mt-8 p-12 text-center">
            <p className="text-5xl">🐕</p>
            <h2 className="mt-4 text-2xl font-extrabold text-on-surface">
              Noch keine kommenden Events
            </h2>
            <p className="mt-2 text-on-surface-variant">
              Schau später wieder vorbei oder starte eine Rudelrunde in der Mobile-App.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
