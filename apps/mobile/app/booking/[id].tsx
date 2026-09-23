import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useAcceptBooking,
  useBooking,
  useCancelBooking,
  useCompleteBooking,
  useCurrentUser,
  useRateHelper,
  useRateSeeker,
  useRejectBooking,
  useStartBooking,
  type Database,
} from '@pfotennetz/supabase';
import { formatCurrency, formatDate, formatTimebankHoursMagnitude } from '@pfotennetz/shared';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  StatusBadge,
  appFonts,
  statusColor,
  usePalette,
} from '../../components/ui';
import {
  bookingTypeLabels,
  bookingWorkflowStepLabels,
  bookingWorkflowSteps,
  keyHandoffLabel,
} from '../../lib/booking';

type BookingStatus = Database['public']['Enums']['booking_status'];

function WorkflowTimeline({ status }: { status: BookingStatus }) {
  const c = usePalette();
  const currentIndex = bookingWorkflowSteps.indexOf(status);
  if (currentIndex < 0) {
    // cancelled / disputed: no linear progress to show.
    return null;
  }
  return (
    <View style={styles.timeline}>
      {bookingWorkflowSteps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const label = bookingWorkflowStepLabels[step] ?? step;
        return (
          <View key={step} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: done || current ? statusColor(step, c) : c.outlineVariant,
                  borderColor: current ? statusColor(step, c) : 'transparent',
                },
              ]}
            />
            <Text
              style={[
                styles.timelineLabel,
                { color: done || current ? c.onSurface : c.onSurfaceVariant },
                current ? styles.timelineLabelCurrent : undefined,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function RateRow({
  title,
  onRate,
  pending,
}: {
  title: string;
  onRate: (rating: number) => void;
  pending: boolean;
}) {
  const c = usePalette();
  const ratings = [1, 2, 3, 4, 5];
  return (
    <View style={styles.rateRow}>
      <Text style={[styles.rateTitle, { color: c.onSurface }]}>{title}</Text>
      <View style={styles.rateButtons}>
        {ratings.map((rating) => (
          <Pressable
            key={rating}
            accessibilityRole="button"
            accessibilityLabel={`${rating} von 5 Sternen`}
            disabled={pending}
            onPress={() => {
              onRate(rating);
            }}
            style={[
              styles.rateButton,
              { backgroundColor: c.surfaceContainerHigh, opacity: pending ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.rateButtonText, { color: c.onSurface }]}>{rating}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = typeof id === 'string' && id.length > 0 ? id : undefined;

  const bookingQuery = useBooking(bookingId);
  const userQuery = useCurrentUser();

  const accept = useAcceptBooking();
  const reject = useRejectBooking();
  const start = useStartBooking();
  const complete = useCompleteBooking();
  const cancel = useCancelBooking();
  const rateHelper = useRateHelper();
  const rateSeeker = useRateSeeker();

  const [ratingDone, setRatingDone] = useState(false);

  const anyPending =
    accept.isPending ||
    reject.isPending ||
    start.isPending ||
    complete.isPending ||
    cancel.isPending ||
    rateHelper.isPending ||
    rateSeeker.isPending;

  const mutationError =
    accept.error ?? reject.error ?? start.error ?? complete.error ?? cancel.error ?? null;
  const ratingError = rateHelper.error ?? rateSeeker.error ?? null;

  const booking = bookingQuery.data ?? null;
  const currentUserId = userQuery.data?.id ?? null;
  const isHelper =
    booking !== null && booking.helper_id !== null && booking.helper_id === currentUserId;
  const isSeeker = booking !== null && booking.seeker_id === currentUserId;

  const handleRateHelper = (rating: number) => {
    if (bookingId === undefined) return;
    rateHelper.mutate({ bookingId, rating }, { onSuccess: () => setRatingDone(true) });
  };

  const handleRateSeeker = (rating: number) => {
    if (bookingId === undefined) return;
    rateSeeker.mutate({ bookingId, rating }, { onSuccess: () => setRatingDone(true) });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: c.primary }]}>‹ Zurück</Text>
        </Pressable>

        {bookingId === undefined ? (
          <ErrorBox message="Keine Buchungs-ID angegeben." />
        ) : bookingQuery.isPending || userQuery.isPending ? (
          <LoadingView label="Buchung wird geladen …" />
        ) : bookingQuery.isError ? (
          <ErrorBox
            message={`Buchung konnte nicht geladen werden: ${bookingQuery.error.message}`}
            onRetry={() => {
              void bookingQuery.refetch();
            }}
          />
        ) : booking === null ? (
          <ErrorBox
            message="Buchung nicht gefunden."
            onRetry={() => {
              void bookingQuery.refetch();
            }}
          />
        ) : (
          <>
            <View style={styles.header}>
              <Text style={[styles.bookingNumber, { color: c.onSurface }]}>
                {booking.booking_number}
              </Text>
              <StatusBadge status={booking.status} />
            </View>

            <Card>
              <SectionTitle>Ablauf</SectionTitle>
              <WorkflowTimeline status={booking.status} />
              {booking.status === 'cancelled' || booking.status === 'disputed' ? (
                <EmptyText>
                  Diese Buchung wurde{' '}
                  {booking.status === 'cancelled' ? 'storniert' : 'als Streitfall markiert'} und
                  kann nicht fortgesetzt werden.
                </EmptyText>
              ) : null}
            </Card>

            <Card>
              <SectionTitle>Details</SectionTitle>
              <InfoRow label="Typ" value={bookingTypeLabels[booking.type]} />
              <InfoRow label="Tier" value={booking.pet?.name ?? '–'} />
              <InfoRow label="Suchende:r" value={booking.seekerProfile?.display_name ?? '–'} />
              <InfoRow label="Helfende:r" value={booking.helperProfile?.display_name ?? '–'} />
              <InfoRow
                label="Start"
                value={formatDate(booking.start_at, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
              <InfoRow
                label="Ende"
                value={formatDate(booking.end_at, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
              <InfoRow label="Treffpunkt" value={booking.meeting_address ?? '–'} />
              <InfoRow label="Schlüssel" value={keyHandoffLabel(booking.key_handoff_type)} />
              <InfoRow
                label="Preis"
                value={
                  booking.currency === 'KIEZ_HOURS'
                    ? formatTimebankHoursMagnitude(booking.price_kiez_hours)
                    : formatCurrency(booking.price_eur_cents)
                }
              />
              {booking.status === 'completed' ? (
                <>
                  <InfoRow
                    label="Gutgeschrieben"
                    value={formatTimebankHoursMagnitude(booking.timebank_credits_earned)}
                  />
                  <InfoRow
                    label="Verbraucht"
                    value={formatTimebankHoursMagnitude(booking.timebank_credits_spent)}
                  />
                </>
              ) : null}
            </Card>

            {booking.helper_id !== null &&
            (booking.status === 'confirmed' ||
              booking.status === 'in_progress' ||
              booking.status === 'completed') ? (
              <Card>
                <SectionTitle>Nachrichten</SectionTitle>
                <EmptyText>Stimme dich direkt mit deiner Betreuung ab.</EmptyText>
                <ActionButton
                  title="Chat öffnen"
                  variant="secondary"
                  onPress={() => {
                    if (bookingId !== undefined) {
                      router.push({ pathname: '/chat/[bookingId]', params: { bookingId } });
                    }
                  }}
                />
              </Card>
            ) : null}

            {mutationError !== null ? <ErrorBox message={mutationError.message} /> : null}

            {booking.status === 'requested' && isHelper ? (
              <Card>
                <SectionTitle>Anfrage</SectionTitle>
                <ActionButton
                  title="Annehmen"
                  pending={accept.isPending}
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) accept.mutate(bookingId);
                  }}
                />
                <ActionButton
                  title="Ablehnen"
                  variant="secondary"
                  pending={reject.isPending}
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) reject.mutate(bookingId);
                  }}
                />
              </Card>
            ) : null}

            {booking.status === 'confirmed' && isHelper ? (
              <Card>
                <SectionTitle>Bereit?</SectionTitle>
                <ActionButton
                  title="Buchung starten"
                  pending={start.isPending}
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) start.mutate(bookingId);
                  }}
                />
              </Card>
            ) : null}

            {booking.status === 'in_progress' && isHelper ? (
              <Card>
                <SectionTitle>Abschluss</SectionTitle>
                <EmptyText>
                  Beim Abschluss rechnet der Server die Nachbarschafts-Stunden automatisch ab. Dein
                  Guthaben wird danach neu geladen.
                </EmptyText>
                <ActionButton
                  title="Buchung abschließen"
                  pending={complete.isPending}
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) complete.mutate(bookingId);
                  }}
                />
              </Card>
            ) : null}

            {(booking.status === 'requested' || booking.status === 'confirmed') && isSeeker ? (
              <Card>
                <SectionTitle>Stornierung</SectionTitle>
                <ActionButton
                  title="Buchung stornieren"
                  variant="danger"
                  pending={cancel.isPending}
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) cancel.mutate(bookingId);
                  }}
                />
              </Card>
            ) : null}

            {booking.status === 'completed' ? (
              <Card>
                <SectionTitle>Bewertung</SectionTitle>
                {isSeeker ? (
                  booking.rating_helper === null ? (
                    <RateRow
                      title="Wie war die Hilfe?"
                      onRate={handleRateHelper}
                      pending={rateHelper.isPending}
                    />
                  ) : (
                    <InfoRow label="Deine Bewertung" value={`${booking.rating_helper} von 5`} />
                  )
                ) : null}
                {isHelper ? (
                  booking.rating_seeker === null ? (
                    <RateRow
                      title="Wie war die Zusammenarbeit?"
                      onRate={handleRateSeeker}
                      pending={rateSeeker.isPending}
                    />
                  ) : (
                    <InfoRow label="Deine Bewertung" value={`${booking.rating_seeker} von 5`} />
                  )
                ) : null}
                {!isSeeker && !isHelper ? (
                  <EmptyText>Du bist an dieser Buchung nicht beteiligt.</EmptyText>
                ) : null}
                {ratingError !== null ? <ErrorBox message={ratingError.message} /> : null}
                {ratingDone ? <EmptyText>Danke für deine Bewertung.</EmptyText> : null}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  backButton: { paddingVertical: 12, marginBottom: 4, alignSelf: 'flex-start' },
  backText: { fontFamily: appFonts.semibold, fontSize: 15, lineHeight: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  bookingNumber: { fontFamily: appFonts.extrabold, fontSize: 20, lineHeight: 28, flexShrink: 1 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timelineStep: { flex: 1, alignItems: 'center', gap: 6 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  timelineLabel: {
    fontFamily: appFonts.regular,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  timelineLabelCurrent: { fontFamily: appFonts.extrabold },
  rateRow: { marginTop: 4 },
  rateTitle: {
    fontFamily: appFonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  rateButtons: { flexDirection: 'row', gap: 8 },
  rateButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButtonText: { fontFamily: appFonts.bold, fontSize: 15, lineHeight: 20 },
});
