'use client';

import {
  EVENT_TYPE_LABELS,
  useCreateCommunityEvent,
  useJoinCommunityEvent,
  useLeaveCommunityEvent,
  useCurrentUser,
  useOwnEventParticipants,
  useUpcomingCommunityEvents,
  useParticipantsForEvents,
  useParticipantProfilesForEvents,
  useOwnProfile,
  useModerateCommunityEvent,
} from '@pfotennetz/supabase';
import { WebHeader } from '../../components/WebHeader';
import { useState } from 'react';

const EVENT_TYPES = Object.entries(EVENT_TYPE_LABELS) as [
  'group_walk' | 'playdate' | 'meetup' | 'swap_meet' | 'training' | 'other',
  string,
][];

function getLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Standortfreigabe wird von diesem Browser nicht unterstützt.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Für ein Event muss der Standort freigegeben werden.')),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  });
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const create = useCreateCommunityEvent();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof EVENT_TYPES)[number][0]>('group_walk');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !startsAt) return;
    try {
      const location = await getLocation();
      await create.mutateAsync({
        title: title.trim(),
        type,
        description: description.trim(),
        address: address.trim(),
        startsAt: new Date(startsAt).toISOString(),
        ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
        ...(maxParticipants ? { maxParticipants: Number(maxParticipants) } : {}),
        ...location,
      });
      onCreated();
    } catch {
      // The mutation error is shown below; location errors are shown there as well.
    }
  };

  return (
    <form onSubmit={submit} className="card mb-8 grid gap-4 p-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-2xl font-extrabold">Neues Community-Event</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Der Veranstaltungsort wird über deinen aktuellen Standort gespeichert.
        </p>
      </div>
      <label className="text-sm font-bold">
        Titel
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="input mt-2"
          placeholder="z. B. Sonntags-Rudelrunde"
        />
      </label>
      <label className="text-sm font-bold">
        Art
        <select
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className="input mt-2"
        >
          {EVENT_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-bold">
        Beginn
        <input
          required
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="input mt-2"
        />
      </label>
      <label className="text-sm font-bold">
        Ende (optional)
        <input
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className="input mt-2"
        />
      </label>
      <label className="text-sm font-bold">
        Adresse/Hinweis
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="input mt-2"
          placeholder="z. B. Eingang am Park"
        />
      </label>
      <label className="text-sm font-bold">
        Max. Teilnehmende
        <input
          type="number"
          min="1"
          value={maxParticipants}
          onChange={(event) => setMaxParticipants(event.target.value)}
          className="input mt-2"
          placeholder="optional"
        />
      </label>
      <label className="text-sm font-bold md:col-span-2">
        Beschreibung
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input mt-2 h-auto min-h-28 py-3"
          placeholder="Was ist geplant?"
        />
      </label>
      <div className="md:col-span-2 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Wird erstellt …' : 'Event erstellen'}
        </button>
        {create.isError ? (
          <p role="alert" className="text-sm text-error">
            Event konnte nicht erstellt werden: {create.error.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export default function CommunityPage() {
  const [showCreate, setShowCreate] = useState(false);
  const events = useUpcomingCommunityEvents();
  const user = useCurrentUser();
  const profile = useOwnProfile();
  const participants = useOwnEventParticipants();
  const eventParticipants = useParticipantsForEvents(events.data?.map((event) => event.id) ?? []);
  const participantProfiles = useParticipantProfilesForEvents(
    events.data?.map((event) => event.id) ?? []
  );
  const join = useJoinCommunityEvent();
  const leave = useLeaveCommunityEvent();
  const moderate = useModerateCommunityEvent();
  const joined = new Set(
    (participants.data ?? [])
      .filter((participant) => participant.status === 'going')
      .map((participant) => participant.event_id)
  );
  const mutationPending = join.isPending || leave.isPending;
  const participantCount = (eventId: string) =>
    eventParticipants.data?.filter((participant) => participant.event_id === eventId).length ?? 0;
  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Community</p>
        <h1 className="mt-2 text-4xl font-extrabold text-on-surface">
          Nachbarschafts-Treff & Playdates
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
          Gemeinsam spazieren, austauschen und neue Menschen mit Tierliebe kennenlernen.
        </p>
        <button
          type="button"
          className="btn-primary mt-6"
          onClick={() => setShowCreate((visible) => !visible)}
        >
          {showCreate ? 'Formular schließen' : 'Event erstellen'}
        </button>
        {showCreate ? <CreateEventForm onCreated={() => setShowCreate(false)} /> : null}
        {events.isPending || participants.isPending || user.isPending ? (
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
                    {EVENT_TYPE_LABELS[event.type]}
                  </span>
                  <span className="text-sm font-bold text-secondary">
                    {new Date(event.starts_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-extrabold text-on-surface">{event.title}</h2>
                {profile.data?.role === 'admin' ? (
                  <button
                    type="button"
                    className="mt-3 text-sm font-bold text-error"
                    disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ eventId: event.id, isPublic: false })}
                  >
                    Event ausblenden
                  </button>
                ) : null}
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
                <p className="mt-5 text-sm font-bold text-secondary">
                  {joined.has(event.id) ? '✓ Du nimmst teil' : 'Noch nicht vorgemerkt'}
                </p>
                {event.organizer_id === user.data?.id ? (
                  <div className="mt-2 text-sm text-on-surface-variant">
                    <p>
                      {participantCount(event.id)} Zusage
                      {participantCount(event.id) === 1 ? '' : 'n'}
                      {event.max_participants ? ` von ${event.max_participants}` : ''}
                    </p>
                    {participantProfiles.data?.[event.id]?.length ? (
                      <p className="mt-1 text-xs">
                        {participantProfiles.data?.[event.id]
                          ?.map((profile) => profile.display_name ?? 'Teilnehmende Person')
                          .join(' · ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`${joined.has(event.id) ? 'btn-secondary' : 'btn-primary'} mt-6 w-full`}
                  disabled={mutationPending}
                  onClick={() =>
                    joined.has(event.id) ? leave.mutate(event.id) : join.mutate(event.id)
                  }
                >
                  {joined.has(event.id) ? 'Teilnahme zurücknehmen' : 'Teilnahme vormerken'}
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
        {join.isError || leave.isError ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-error-container p-4 text-sm text-on-error-container"
          >
            Teilnahme konnte nicht gespeichert werden. Bitte versuche es erneut.
          </p>
        ) : null}
      </div>
    </main>
  );
}
