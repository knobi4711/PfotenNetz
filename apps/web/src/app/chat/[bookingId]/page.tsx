'use client';

import {
  useBooking,
  useBookingMessages,
  useCurrentUser,
  useSendBookingMessage,
  useUploadBookingMessageImage,
} from '@pfotennetz/supabase';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { WebHeader } from '../../../components/WebHeader';

export default function BookingChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const booking = useBooking(bookingId);
  const messages = useBookingMessages(bookingId);
  const user = useCurrentUser();
  const send = useSendBookingMessage();
  const upload = useUploadBookingMessageImage();
  const [draft, setDraft] = useState('');
  const otherPerson = useMemo(() => {
    if (!booking.data || !user.data) return null;
    return booking.data.seeker_id === user.data.id
      ? booking.data.helperProfile
      : booking.data.seekerProfile;
  }, [booking.data, user.data]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || send.isPending) return;
    const content = draft.trim();
    setDraft('');
    send.mutate({ bookingId, content }, { onError: () => setDraft(content) });
  };

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref={`/booking/${bookingId}`} backLabel="Betreuung" />
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">
          PfotenNetz Chat
        </p>
        <h1 className="mt-1 text-xl font-extrabold">
          {otherPerson?.display_name ?? 'Nachrichtenaustausch'}
        </h1>
        <p className="text-sm text-on-surface-variant">
          Betreuung für {booking.data?.pet?.name ?? 'Tier'}
        </p>
      </div>
      <div className="mx-auto flex max-w-4xl flex-col px-6 py-8">
        {booking.isError || messages.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
            Chat konnte nicht geladen werden: {booking.error?.message ?? messages.error?.message}
          </p>
        ) : null}
        {booking.isPending || messages.isPending || user.isPending ? (
          <p className="py-10 text-center text-on-surface-variant">Chat wird geladen …</p>
        ) : null}
        <section
          className="card min-h-[55vh] space-y-3 p-6"
          aria-live="polite"
          aria-label="Nachrichtenverlauf"
        >
          {messages.data?.length ? (
            messages.data.map((message) => {
              const own = message.sender_id === user.data?.id;
              return (
                <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${own ? 'bg-primary text-on-primary' : 'border border-outline-variant bg-surface-container-lowest'}`}
                  >
                    {message.type === 'image' && message.mediaUrl ? (
                      <Image
                        src={message.mediaUrl}
                        alt="Gesendetes Foto"
                        width={480}
                        height={320}
                        unoptimized
                        className="max-h-64 rounded-xl object-cover"
                      />
                    ) : message.type === 'voice' && message.mediaUrl ? (
                      <audio
                        controls
                        preload="metadata"
                        src={message.mediaUrl}
                        aria-label="Sprachnachricht"
                      >
                        Sprachnachricht kann in diesem Browser nicht abgespielt werden.
                      </audio>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    <time className="mt-1 block text-right text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-on-surface-variant">
              Noch keine Nachrichten. Starte den Austausch.
            </p>
          )}
        </section>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Schnellantworten">
          {['Danke! ❤️', 'Gibt es Probleme?', 'Wasser gegeben?'].map((reply) => (
            <button
              key={reply}
              type="button"
              className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface"
              onClick={() => setDraft(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-4 flex gap-3">
          <label className="btn-secondary cursor-pointer whitespace-nowrap">
            Foto
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={upload.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file
                  .arrayBuffer()
                  .then((fileData) =>
                    upload.mutate({ bookingId, fileData, contentType: file.type })
                  );
                event.currentTarget.value = '';
              }}
            />
          </label>
          <input
            aria-label="Nachricht"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nachricht schreiben …"
            className="input flex-1"
            disabled={send.isPending}
          />
          <button type="submit" className="btn-primary" disabled={!draft.trim() || send.isPending}>
            Senden
          </button>
        </form>
        {send.isError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            Nachricht konnte nicht gesendet werden: {send.error.message}
          </p>
        ) : null}
        {upload.isError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            Foto konnte nicht gesendet werden: {upload.error.message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
