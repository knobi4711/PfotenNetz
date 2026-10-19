'use client';

import { useState } from 'react';
import {
  useAcceptBooking,
  useBooking,
  useBookingGroup,
  useCancelBooking,
  useCompleteBooking,
  useCurrentUser,
  useOwnProfile,
  useRateHelper,
  useRateSeeker,
  useRejectBooking,
  useStartBooking,
  type BookingRatingInput,
} from '@pfotennetz/supabase';
import { bookingTypeLabel } from '@pfotennetz/shared';
import { useParams, useRouter } from 'next/navigation';
import { WebHeader } from '../../../components/WebHeader';
import { WebTrackingRecorder } from '../../../components/WebTrackingRecorder';

const STATUS: Record<string, string> = {
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  in_progress: 'Läuft gerade',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  disputed: 'Streitfall',
};

type RatingFields = Omit<BookingRatingInput, 'bookingId' | 'review'>;
type RatingKey = keyof RatingFields;

const RATING_CRITERIA: ReadonlyArray<{ key: RatingKey; label: string }> = [
  { key: 'friendliness', label: 'Freundlichkeit' },
  { key: 'reliability', label: 'Zuverlässigkeit / Pünktlichkeit' },
  { key: 'animalCare', label: 'Umgang mit den Tieren' },
  { key: 'communication', label: 'Kommunikation' },
];

const EMPTY_RATING: RatingFields = {
  friendliness: 0,
  reliability: 0,
  animalCare: 0,
  communication: 0,
};

function RatingForm({
  title,
  onSubmit,
  pending,
}: {
  title: string;
  onSubmit: (rating: RatingFields & { review?: string }) => void;
  pending: boolean;
}) {
  const [values, setValues] = useState<RatingFields>(EMPTY_RATING);
  const [review, setReview] = useState('');
  const complete = RATING_CRITERIA.every(({ key }) => values[key] > 0);

  return (
    <div className="mt-5 space-y-5">
      <h3 className="text-base font-extrabold">{title}</h3>
      {RATING_CRITERIA.map(({ key, label }) => (
        <fieldset key={key}>
          <legend className="mb-2 text-sm font-bold text-on-surface-variant">{label}</legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((rating) => {
              const selected = values[key] === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  aria-label={`${label}: ${rating} von 5`}
                  aria-pressed={selected}
                  disabled={pending}
                  onClick={() => setValues((current) => ({ ...current, [key]: rating }))}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                    selected
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface hover:bg-primary-fixed'
                  } ${pending ? 'opacity-60' : ''}`}
                >
                  {rating}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div>
        <label
          htmlFor="booking-review"
          className="mb-2 block text-sm font-bold text-on-surface-variant"
        >
          Kurzer Text (optional)
        </label>
        <textarea
          id="booking-review"
          value={review}
          maxLength={500}
          rows={3}
          disabled={pending}
          onChange={(event) => setReview(event.target.value)}
          placeholder="Was lief besonders gut?"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
        />
        <p className="mt-1 text-right text-xs text-on-surface-variant">{review.length}/500</p>
      </div>
      <button
        type="button"
        className="btn-primary w-full"
        disabled={!complete || pending}
        onClick={() => {
          const trimmedReview = review.trim();
          onSubmit(trimmedReview.length > 0 ? { ...values, review: trimmedReview } : values);
        }}
      >
        {pending ? 'Wird gespeichert …' : 'Bewertung absenden'}
      </button>
    </div>
  );
}

function RatingSummary({
  values,
  overall,
  review,
}: {
  values: Partial<Record<RatingKey, number | null>>;
  overall: number | null;
  review: string | null;
}) {
  const hasCriteria = RATING_CRITERIA.every(({ key }) => typeof values[key] === 'number');
  return (
    <div className="mt-5 space-y-3">
      <p className="font-bold">Gesamt: {overall ?? '–'} / 5</p>
      {hasCriteria ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {RATING_CRITERIA.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-xs font-bold text-on-surface-variant">{label}</dt>
              <dd className="mt-1 text-sm">{values[key]} von 5</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {review ? <p className="text-sm italic text-on-surface-variant">„{review}“</p> : null}
    </div>
  );
}

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const booking = useBooking(id);
  const user = useCurrentUser();
  const profile = useOwnProfile();
  const accept = useAcceptBooking();
  const reject = useRejectBooking();
  const start = useStartBooking();
  const complete = useCompleteBooking();
  const cancel = useCancelBooking();
  const rateHelper = useRateHelper();
  const rateSeeker = useRateSeeker();
  const [ratingDone, setRatingDone] = useState(false);
  const value = booking.data;
  const bookingGroup = useBookingGroup(value?.booking_group_id);
  const groupedBookings = bookingGroup.data ?? (value ? [value] : []);
  const groupedPetNames = groupedBookings.map((item) => item.pet?.name ?? 'Tier');
  const isHelper = value?.helper_id === user.data?.id;
  const isSeeker = value?.seeker_id === user.data?.id;
  const isOpenRequest =
    value?.status === 'requested' &&
    value.helper_id === null &&
    value.seeker_id !== user.data?.id &&
    profile.data?.role === 'helper';
  const pending =
    accept.isPending ||
    reject.isPending ||
    start.isPending ||
    complete.isPending ||
    cancel.isPending ||
    rateHelper.isPending ||
    rateSeeker.isPending;
  const ratingError = rateHelper.error ?? rateSeeker.error ?? null;

  const handleRateHelper = (rating: RatingFields & { review?: string }) => {
    rateHelper.mutate({ bookingId: id, ...rating }, { onSuccess: () => setRatingDone(true) });
  };

  const handleRateSeeker = (rating: RatingFields & { review?: string }) => {
    rateSeeker.mutate({ bookingId: id, ...rating }, { onSuccess: () => setRatingDone(true) });
  };

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
                  Betreuung für {groupedPetNames.join(', ') || 'Tier'}
                </h1>
                {groupedBookings.length > 1 ? (
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Ein gemeinsamer Antrag für {groupedBookings.length} Tiere
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-primary-fixed px-4 py-2 text-sm font-bold text-on-primary-fixed-variant">
                {STATUS[value.status] ?? value.status}
              </span>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="card p-7">
                <h2 className="text-xl font-extrabold">Details</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <Row label="Art" value={bookingTypeLabel(value.type)} />
                  <Row
                    label="Betreuungsort"
                    value={
                      value.care_location === 'at_owner_home_live_in'
                        ? 'Bei der Halterin/dem Halter zu Hause – Helper zieht vorübergehend ein'
                        : value.care_location === 'at_helper_home'
                          ? 'Beim Helper zu Hause'
                          : 'Bei der Halterin/dem Halter zu Hause (Besuche)'
                    }
                  />
                  <Row label="Start" value={new Date(value.start_at).toLocaleString('de-DE')} />
                  <Row label="Ende" value={new Date(value.end_at).toLocaleString('de-DE')} />
                  <Row label="Treffpunkt" value={value.meeting_address ?? 'Nicht angegeben'} />
                  <Row label="Dringend" value={value.is_urgent ? 'Ja' : 'Nein'} />
                  {groupedBookings.length > 1 ? (
                    <Row label="Tiere im Antrag" value={groupedPetNames.join(', ')} />
                  ) : null}
                  <Row label="Betreuungsnotizen" value={value.care_notes ?? 'Keine'} />
                  <Row label="Suchende:r" value={value.seekerProfile?.display_name ?? '–'} />
                  <Row
                    label="Helfer:in"
                    value={value.helperProfile?.display_name ?? 'Noch nicht zugewiesen'}
                  />
                  {value.status === 'completed' || value.status === 'cancelled' ? (
                    <>
                      <Row
                        label={value.status === 'cancelled' ? 'Storniert am' : 'Abgeschlossen am'}
                        value={new Date(
                          value.closed_at ?? value.cancelled_at ?? value.updated_at
                        ).toLocaleString('de-DE')}
                      />
                      {value.status === 'cancelled' && value.cancellation_reason ? (
                        <Row label="Stornierungsgrund" value={value.cancellation_reason} />
                      ) : null}
                    </>
                  ) : null}
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
                  {value.status === 'requested' && isOpenRequest ? (
                    <button
                      className="btn-primary w-full"
                      disabled={pending}
                      onClick={() => accept.mutate(id)}
                    >
                      Anfrage annehmen
                    </button>
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
                  {value.status === 'requested' && isSeeker ? (
                    <button
                      className="btn-secondary w-full"
                      disabled={pending}
                      onClick={() => router.push(`/booking/new?bookingId=${id}`)}
                    >
                      Anfrage bearbeiten
                    </button>
                  ) : null}
                  {isSeeker && (value.status === 'requested' || value.status === 'confirmed') ? (
                    <button
                      className="btn-secondary w-full"
                      disabled={pending}
                      onClick={() => cancel.mutate(id)}
                    >
                      {value.status === 'requested' ? 'Anfrage stornieren' : 'Buchung stornieren'}
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
            {value.status === 'in_progress' && isHelper ? (
              <WebTrackingRecorder bookingId={id} />
            ) : null}
            {value.status === 'completed' && (isSeeker || isHelper) ? (
              <section className="card mt-6 p-7">
                <h2 className="text-xl font-extrabold">Bewertung</h2>
                {isSeeker ? (
                  value.rating_helper === null ? (
                    <RatingForm
                      title="Wie war die Betreuung durch den Helfer?"
                      onSubmit={handleRateHelper}
                      pending={rateHelper.isPending}
                    />
                  ) : (
                    <RatingSummary
                      overall={value.rating_helper}
                      review={value.review_helper}
                      values={{
                        friendliness: value.rating_helper_friendliness,
                        reliability: value.rating_helper_reliability,
                        animalCare: value.rating_helper_animal_care,
                        communication: value.rating_helper_communication,
                      }}
                    />
                  )
                ) : null}
                {isHelper ? (
                  value.rating_seeker === null ? (
                    <RatingForm
                      title="Wie war die Zusammenarbeit mit dem Anbieter?"
                      onSubmit={handleRateSeeker}
                      pending={rateSeeker.isPending}
                    />
                  ) : (
                    <RatingSummary
                      overall={value.rating_seeker}
                      review={value.review_seeker}
                      values={{
                        friendliness: value.rating_seeker_friendliness,
                        reliability: value.rating_seeker_reliability,
                        animalCare: value.rating_seeker_animal_care,
                        communication: value.rating_seeker_communication,
                      }}
                    />
                  )
                ) : null}
                {ratingError ? (
                  <p role="alert" className="mt-4 text-sm text-error">
                    Bewertung konnte nicht gespeichert werden: {ratingError.message}
                  </p>
                ) : null}
                {ratingDone ? (
                  <p className="mt-4 text-sm font-bold text-secondary">
                    Danke für deine Bewertung.
                  </p>
                ) : null}
              </section>
            ) : null}
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
