'use client';

import { useBooking, useBookingGroup, useCurrentUser, usePetsByIds } from '@pfotennetz/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PetEmergencyCard } from '../../../../components/PetEmergencyCard';
import { WebHeader } from '../../../../components/WebHeader';

/**
 * Emergency cards of the pets in one booking. The helper sees this data
 * automatically once the owner has confirmed the booking; no public link or
 * extra sharing step is needed.
 */
export default function BookingEmergencyCardsPage() {
  const { id } = useParams<{ id: string }>();
  const bookingQuery = useBooking(id);
  const userQuery = useCurrentUser();
  const booking = bookingQuery.data ?? null;
  const groupQuery = useBookingGroup(booking?.booking_group_id);
  const groupBookings = groupQuery.data ?? (booking ? [booking] : []);

  const isHelper =
    booking !== null && booking.helper_id !== null && booking.helper_id === userQuery.data?.id;
  const careActive = booking?.status === 'confirmed' || booking?.status === 'in_progress';
  const canView = isHelper && careActive;

  const petIds = groupBookings.flatMap((item) => (item.pet ? [item.pet.id] : []));
  const petNames = groupBookings.flatMap((item) => (item.pet ? [item.pet.name] : []));
  const petsQuery = usePetsByIds(canView ? petIds : []);
  const pets = petsQuery.data ?? [];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-surface">
      <WebHeader backHref={`/booking/${id}`} backLabel="Betreuung" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-error">
          Automatisch freigeschaltet
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">Notfallkarten</h1>
        <p className="mt-3 text-on-surface-variant">
          {petNames.length > 0
            ? `Betreuung von ${petNames.join(', ')}.`
            : 'Notfallkarten der betreuten Tiere.'}
        </p>

        {bookingQuery.isPending || userQuery.isPending ? (
          <p className="mt-8">Notfallkarten werden geladen …</p>
        ) : null}

        {bookingQuery.isError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-error-container p-4 text-on-error-container"
          >
            Betreuung konnte nicht geladen werden: {bookingQuery.error.message}
          </p>
        ) : null}

        {!bookingQuery.isPending && !bookingQuery.isError && booking === null ? (
          <section className="card mt-8 p-6">
            <h2 className="text-xl font-extrabold">Betreuung nicht gefunden</h2>
            <Link href="/bookings" className="btn-secondary mt-5 inline-flex">
              Zur Übersicht
            </Link>
          </section>
        ) : null}

        {booking !== null && userQuery.data !== undefined && !isHelper ? (
          <section className="card mt-8 p-6">
            <p className="text-on-surface-variant">
              Diese Notfallkarten sind nur für die helfende Person der Betreuung sichtbar.
            </p>
          </section>
        ) : null}

        {booking !== null && isHelper && !careActive ? (
          <section className="card mt-8 p-6">
            <p className="text-on-surface-variant">
              {booking.status === 'completed'
                ? 'Die Betreuung ist abgeschlossen. Die Notfallkarten stehen nur während einer laufenden Betreuung bereit.'
                : 'Die Notfallkarten werden automatisch freigeschaltet, sobald die Betreuung bestätigt ist.'}
            </p>
          </section>
        ) : null}

        {canView ? (
          petIds.length === 0 ? (
            <section className="card mt-8 p-6">
              <p className="text-on-surface-variant">
                Für diese Betreuung sind noch keine Notfallkarten hinterlegt.
              </p>
            </section>
          ) : petsQuery.isPending ? (
            <p className="mt-8">Notfallkarten werden geladen …</p>
          ) : petsQuery.isError ? (
            <section role="alert" className="card mt-8 p-6">
              <p className="text-on-error-container">
                Notfallkarten konnten nicht geladen werden: {petsQuery.error.message}
              </p>
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => void petsQuery.refetch()}
              >
                Erneut versuchen
              </button>
            </section>
          ) : pets.length === 0 ? (
            <section className="card mt-8 p-6">
              <p className="text-on-surface-variant">
                Für diese Betreuung sind noch keine Notfallkarten hinterlegt.
              </p>
            </section>
          ) : (
            <>
              <p className="mt-6 rounded-xl bg-secondary-container p-4 text-sm text-on-secondary-container">
                Diese Notfallkarten gehören zu den Tieren deiner Betreuung. Medikamente, Allergien
                und Tierarztkontakte stehen dir hier ohne zusätzlichen Link zur Verfügung.
              </p>
              {pets.map((pet) => (
                <PetEmergencyCard key={pet.id} pet={pet} />
              ))}
            </>
          )
        ) : null}
      </div>
    </main>
  );
}
