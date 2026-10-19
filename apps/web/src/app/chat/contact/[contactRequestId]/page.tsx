'use client';

import {
  useContactMessages,
  useCurrentUser,
  useOwnContactRequests,
  useSendContactMessage,
} from '@pfotennetz/supabase';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { WebHeader } from '../../../../components/WebHeader';

export default function ContactChatPage() {
  const { contactRequestId } = useParams<{ contactRequestId: string }>();
  const router = useRouter();
  const user = useCurrentUser();
  const requests = useOwnContactRequests();
  const messages = useContactMessages(contactRequestId);
  const send = useSendContactMessage();
  const [draft, setDraft] = useState('');
  const request = useMemo(
    () => requests.data?.find((item) => item.id === contactRequestId) ?? null,
    [contactRequestId, requests.data]
  );
  const otherPerson = request
    ? request.requester_id === user.data?.id
      ? request.helperProfile
      : request.requesterProfile
    : null;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || send.isPending) return;
    const content = draft.trim();
    setDraft('');
    send.mutate({ contactRequestId, content }, { onError: () => setDraft(content) });
  };

  const requestIsOpen = request?.status === 'pending' || request?.status === 'accepted';

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/" backLabel="Dashboard" />
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">
          Privater Kennenlern-Chat
        </p>
        <h1 className="mt-1 text-xl font-extrabold">
          {otherPerson?.display_name ?? 'Nachrichtenaustausch'}
        </h1>
        <p className="text-sm text-on-surface-variant">
          Lernt euch vor einer möglichen Betreuung in Ruhe kennen.
        </p>
      </div>
      <div className="mx-auto flex max-w-4xl flex-col px-6 py-8">
        {requests.isError || messages.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
            Privater Chat konnte nicht geladen werden:{' '}
            {requests.error?.message ?? messages.error?.message}
          </p>
        ) : null}
        {requests.isPending || messages.isPending || user.isPending ? (
          <p className="py-10 text-center text-on-surface-variant">Chat wird geladen …</p>
        ) : null}
        {!requests.isPending && request === null ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
            Diese Kennenlernanfrage wurde nicht gefunden oder ist für dich nicht zugänglich.
          </p>
        ) : null}
        {request && !requestIsOpen ? (
          <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
            Dieser Chat ist geschlossen, weil die Kennenlernanfrage nicht mehr offen ist.
          </p>
        ) : null}
        <section
          className="card mt-4 min-h-[55vh] space-y-3 p-6"
          aria-live="polite"
          aria-label="Privater Nachrichtenverlauf"
        >
          {messages.data?.length ? (
            messages.data.map((message) => {
              const own = message.sender_id === user.data?.id;
              return (
                <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${own ? 'bg-primary text-on-primary' : 'border border-outline-variant bg-surface-container-lowest'}`}
                  >
                    <p>{message.content}</p>
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
              Noch keine Nachrichten. Stellt euch vor und besprecht eure Fragen.
            </p>
          )}
        </section>
        {requestIsOpen ? (
          <form onSubmit={submit} className="mt-4 flex flex-wrap gap-3">
            <input
              aria-label="Private Nachricht"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nachricht schreiben …"
              className="input flex-1"
              disabled={send.isPending}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!draft.trim() || send.isPending}
            >
              {send.isPending ? 'Wird gesendet …' : 'Senden'}
            </button>
          </form>
        ) : null}
        {send.isError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            Nachricht konnte nicht gesendet werden: {send.error.message}
          </p>
        ) : null}
        {request?.status === 'accepted' && request.requester_id === user.data?.id ? (
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => router.push(`/booking/new?helperId=${request.helper_id}`)}
          >
            Betreuung anfragen
          </button>
        ) : null}
      </div>
    </main>
  );
}
