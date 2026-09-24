'use client';

import {
  useAcceptBooking,
  useBooking,
  useCancelBooking,
  useCompleteBooking,
  useCurrentUser,
  useRejectBooking,
  useStartBooking,
} from '@pfotennetz/supabase';
import { useParams, useRouter } from 'next/navigation';
import { WebHeader } from '../../../components/WebHeader';

const STATUS: Record<string, string> = {
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  in_progress: 'Läuft gerade',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  disputed: 'Streitfall',
};

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const booking = useBooking(id);
  const user = useCurrentUser();
  const accept = useAcceptBooking();
  const reject = useRejectBooking();
  const start = useStartBooking();
  const complete = useCompleteBooking();
  const cancel = useCancelBooking();
  const value = booking.data;
  const isHelper = value?.helper_id === user.data?.id;
  const pending =
    accept.isPending ||
    reject.isPending ||
    start.isPending ||
    complete.isPending ||
    cancel.isPending;

  return (
    <main className="min-h-screen bg-surface">
      <WebHeader backHref="/bookings" backLabel="Anfragen" />
      <div className="mx-auto max-w-5xl px-6 py-10">
        {booking.isPending ? <p>Buchung wird geladen …</p> : null}
        {booking.isError ? (
          <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
            {booking.error.message}
          </p>
        ) : null}
        {value ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">
                  {value.booking_number}
                </p>
                <h1 className="mt-2 text-4xl font-extrabold text-on-surface">
                  Betreuung für {value.pet?.name ?? 'Tier'}
                </h1>
              </div>
              <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-on-primary-fixed-variant">
                {STATUS[value.status] ?? value.status}
              </span>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="card p-7">
                <h2 className="text-xl font-extrabold">Details</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <Row label="Art" value={value.type} />
                  <Row label="Start" value={new Date(value.start_at).toLocaleString('de-DE')} />
                  <Row label="Ende" value={new Date(value.end_at).toLocaleString('de-DE')} />
                  <Row label="Treffpunkt" value={value.meeting_address ?? 'Nicht angegeben'} />
                  <Row label="Suchende:r" value={value.seekerProfile?.display_name ?? '–'} />
                  <Row
                    label="Helfer:in"
                    value={value.helperProfile?.display_name ?? 'Noch nicht zugewiesen'}
                  />
                </dl>
              </section>
              <section className="card p-7">
                <h2 className="text-xl font-extrabold">Nächster Schritt</h2>
                <div className="mt-5 space-y-3">
                  {value.status === 'requested' && isHelper ? (
                    <>
                      <button
                        className="btn-primary w-full"
                        disabled={pending}
                        onClick={() => accept.mutate(id)}
                      >
                        Anfrage annehmen
                      </button>
                      <button
                        className="btn-secondary w-full"
                        disabled={pending}
                        onClick={() => reject.mutate(id)}
                      >
                        Ablehnen
                      </button>
                    </>
                  ) : null}
                  {value.status === 'confirmed' && isHelper ? (
                    <button
                      className="btn-primary w-full"
                      disabled={pending}
                      onClick={() => start.mutate(id)}
                    >
                      Betreuung starten
                    </button>
                  ) : null}
                  {value.status === 'in_progress' && isHelper ? (
                    <button
                      className="btn-primary w-full"
                      disabled={pending}
                      onClick={() => complete.mutate(id)}
                    >
                      Betreuung abschließen
                    </button>
                  ) : null}
                  {value.status !== 'completed' &&
                  value.status !== 'cancelled' &&
                  value.status !== 'disputed' ? (
                    <button
                      className="btn-secondary w-full"
                      disabled={pending}
                      onClick={() => cancel.mutate(id)}
                    >
                      Buchung stornieren
                    </button>
                  ) : null}
                  {value.helper_id ? (
                    <button
                      className="btn-secondary w-full"
                      onClick={() => router.push(`/chat/${id}`)}
                    >
                      Chat öffnen
                    </button>
                  ) : null}
                </div>
                {[accept, reject, start, complete, cancel].find((mutation) => mutation.error) ? (
                  <p role="alert" className="mt-4 text-sm text-error">
                    Aktion fehlgeschlagen. Bitte versuche es erneut.
                  </p>
                ) : null}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-on-surface-variant">{label}</dt>
      <dd className="mt-1 text-on-surface">{value}</dd>
    </div>
  );
}
