import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
  useUpdateBookingRequest,
  type BookingRatingInput,
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
import { TrackingRecorder } from '../../components/tracking-recorder';
import { buildDirectionsUrl, openDirections } from '../../lib/navigation';

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
  const c = usePalette();
  const [values, setValues] = useState<RatingFields>(EMPTY_RATING);
  const [review, setReview] = useState('');
  const complete = RATING_CRITERIA.every(({ key }) => values[key] > 0);
  return (
    <View style={styles.ratingForm}>
      <Text style={[styles.rateTitle, { color: c.onSurface }]}>{title}</Text>
      {RATING_CRITERIA.map(({ key, label }) => (
        <View key={key} style={styles.criterionRow}>
          <Text style={[styles.criterionLabel, { color: c.onSurface }]}>{label}</Text>
          <View style={styles.rateButtons}>
            {[1, 2, 3, 4, 5].map((rating) => {
              const selected = values[key] === rating;
              return (
                <Pressable
                  key={rating}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}: ${rating} von 5`}
                  accessibilityState={{ selected }}
                  disabled={pending}
                  onPress={() => {
                    setValues((current) => ({ ...current, [key]: rating }));
                  }}
                  style={[
                    styles.rateButton,
                    {
                      backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                      opacity: pending ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.rateButtonText, { color: selected ? c.onPrimary : c.onSurface }]}
                  >
                    {rating}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <TextInput
        accessibilityLabel="Kurzer Bewertungstext"
        editable={!pending}
        maxLength={500}
        multiline
        numberOfLines={3}
        onChangeText={setReview}
        placeholder="Optional: Was lief besonders gut?"
        placeholderTextColor={c.onSurfaceVariant}
        style={[styles.reviewInput, { color: c.onSurface, borderColor: c.outlineVariant }]}
        value={review}
      />
      <ActionButton
        title="Bewertung absenden"
        pending={pending}
        disabled={!complete || pending}
        onPress={() => {
          const trimmedReview = review.trim();
          onSubmit(trimmedReview.length > 0 ? { ...values, review: trimmedReview } : values);
        }}
      />
    </View>
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
  const c = usePalette();
  const hasCriteria = RATING_CRITERIA.every(({ key }) => typeof values[key] === 'number');
  return (
    <View style={styles.ratingSummary}>
      <Text style={[styles.summaryOverall, { color: c.onSurface }]}>
        Gesamt: {overall ?? '–'} / 5
      </Text>
      {hasCriteria
        ? RATING_CRITERIA.map(({ key, label }) => (
            <InfoRow key={key} label={label} value={`${values[key]} von 5`} />
          ))
        : null}
      {review ? (
        <Text style={[styles.reviewText, { color: c.onSurfaceVariant }]}>{review}</Text>
      ) : null}
    </View>
  );
}

export default function BookingDetailScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = typeof id === 'string' && id.length > 0 ? id : undefined;

  const bookingQuery = useBooking(bookingId);
  const bookingGroupQuery = useBookingGroup(bookingQuery.data?.booking_group_id);
  const userQuery = useCurrentUser();
  const profileQuery = useOwnProfile();

  const accept = useAcceptBooking();
  const reject = useRejectBooking();
  const start = useStartBooking();
  const complete = useCompleteBooking();
  const cancel = useCancelBooking();
  const updateRequest = useUpdateBookingRequest();
  const rateHelper = useRateHelper();
  const rateSeeker = useRateSeeker();

  const [ratingDone, setRatingDone] = useState(false);
  const [largePhotoVisible, setLargePhotoVisible] = useState(false);

  const anyPending =
    accept.isPending ||
    reject.isPending ||
    start.isPending ||
    complete.isPending ||
    cancel.isPending ||
    updateRequest.isPending ||
    rateHelper.isPending ||
    rateSeeker.isPending;

  const mutationError =
    accept.error ??
    reject.error ??
    start.error ??
    complete.error ??
    cancel.error ??
    updateRequest.error ??
    null;
  const ratingError = rateHelper.error ?? rateSeeker.error ?? null;

  const booking = bookingQuery.data ?? null;
  const groupedBookings = bookingGroupQuery.data ?? (booking ? [booking] : []);
  const groupedPetNames = groupedBookings.map((item) => item.pet?.name ?? 'Tier');
  const currentUserId = userQuery.data?.id ?? null;
  const isHelper =
    booking !== null && booking.helper_id !== null && booking.helper_id === currentUserId;
  const isSeeker = booking !== null && booking.seeker_id === currentUserId;
  const isOpenRequest =
    booking !== null &&
    booking.status === 'requested' &&
    booking.helper_id === null &&
    booking.seeker_id !== currentUserId &&
    profileQuery.data?.role === 'helper';

  const handleRateHelper = (rating: RatingFields & { review?: string }) => {
    if (bookingId === undefined) return;
    rateHelper.mutate({ bookingId, ...rating }, { onSuccess: () => setRatingDone(true) });
  };

  const handleRateSeeker = (rating: RatingFields & { review?: string }) => {
    if (bookingId === undefined) return;
    rateSeeker.mutate({ bookingId, ...rating }, { onSuccess: () => setRatingDone(true) });
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
              <View style={styles.headerMain}>
                <Text style={[styles.bookingNumber, { color: c.onSurface }]}>
                  {booking.booking_number}
                </Text>
                {groupedBookings.length > 1 ? (
                  <Text style={[styles.groupTitle, { color: c.onSurface }]}>
                    Betreuung für {groupedPetNames.join(', ')}
                  </Text>
                ) : null}
              </View>
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
              {booking.pet?.avatar_url ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tierbild groß anzeigen"
                  onPress={() => setLargePhotoVisible(true)}
                  style={styles.petPhotoPreview}
                >
                  <Image source={{ uri: booking.pet.avatar_url }} style={styles.petPhoto} />
                  <Text style={[styles.photoHint, { color: c.primary }]}>Bild vergrößern</Text>
                </Pressable>
              ) : null}
              <InfoRow label="Typ" value={bookingTypeLabels[booking.type]} />
              <InfoRow
                label="Betreuungsort"
                value={
                  booking.care_location === 'at_owner_home_live_in'
                    ? 'Bei der Halterin/dem Halter zu Hause – Helper zieht vorübergehend ein'
                    : booking.care_location === 'at_helper_home'
                      ? 'Beim Helper zu Hause'
                      : 'Bei der Halterin/dem Halter zu Hause (Besuche)'
                }
              />
              <InfoRow label="Tier" value={booking.pet?.name ?? '–'} />
              {groupedBookings.length > 1 ? (
                <InfoRow label="Tiere im Antrag" value={groupedPetNames.join(', ')} />
              ) : null}
              <InfoRow label="Suchende:r" value={booking.seekerProfile?.display_name ?? '–'} />
              <InfoRow label="Helfende:r" value={booking.helperProfile?.display_name ?? '–'} />
              {booking.status === 'completed' || booking.status === 'cancelled' ? (
                <>
                  <InfoRow
                    label={booking.status === 'cancelled' ? 'Storniert am' : 'Abgeschlossen am'}
                    value={formatDate(
                      booking.closed_at ?? booking.cancelled_at ?? booking.updated_at,
                      {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  />
                  {booking.status === 'cancelled' && booking.cancellation_reason ? (
                    <InfoRow label="Stornierungsgrund" value={booking.cancellation_reason} />
                  ) : null}
                </>
              ) : null}
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
              {buildDirectionsUrl(booking.meeting_address ?? '') !== null ? (
                <ActionButton
                  title="Route zum Treffpunkt"
                  variant="secondary"
                  onPress={() => {
                    void openDirections(booking.meeting_address ?? '');
                  }}
                />
              ) : null}
              <InfoRow label="Schlüssel" value={keyHandoffLabel(booking.key_handoff_type)} />
              <InfoRow
                label="Preis"
                value={
                  booking.currency === 'KIEZ_HOURS'
                    ? formatTimebankHoursMagnitude(booking.price_kiez_hours)
                    : `${formatCurrency(booking.price_eur_cents)}${booking.currency === 'PER_VISIT' ? ' pro Besuch' : ''}`
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

            {isOpenRequest ? (
              <Card>
                <SectionTitle>Offene Anfrage</SectionTitle>
                <EmptyText>
                  Übernimm diese Betreuung, wenn Zeitraum und Aufgabe für dich passen.
                </EmptyText>
                <ActionButton
                  title="Anfrage annehmen"
                  pending={accept.isPending}
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) accept.mutate(bookingId);
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

            {booking.status === 'in_progress' && isHelper && bookingId ? (
              <TrackingRecorder bookingId={bookingId} />
            ) : null}

            {(booking.status === 'requested' || booking.status === 'confirmed') && isSeeker ? (
              <Card>
                <SectionTitle>Stornierung</SectionTitle>
                <ActionButton
                  title={
                    booking.status === 'requested' ? 'Anfrage stornieren' : 'Buchung stornieren'
                  }
                  variant="danger"
                  pending={cancel.isPending}
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) cancel.mutate(bookingId);
                  }}
                />
              </Card>
            ) : null}

            {booking.status === 'requested' && isSeeker ? (
              <Card>
                <SectionTitle>Anfrage ändern</SectionTitle>
                <EmptyText>
                  Solange noch kein Helper zugesagt hat, kannst du die Angaben anpassen.
                </EmptyText>
                <ActionButton
                  title="Anfrage bearbeiten"
                  variant="secondary"
                  disabled={anyPending}
                  onPress={() => {
                    if (bookingId !== undefined) {
                      router.push({ pathname: '/booking/new', params: { bookingId } });
                    }
                  }}
                />
              </Card>
            ) : null}

            {booking.status === 'completed' ? (
              <Card>
                <SectionTitle>Bewertung</SectionTitle>
                {isSeeker ? (
                  booking.rating_helper === null ? (
                    <RatingForm
                      title="Wie war die Hilfe?"
                      onSubmit={handleRateHelper}
                      pending={rateHelper.isPending}
                    />
                  ) : (
                    <RatingSummary
                      overall={booking.rating_helper}
                      review={booking.review_helper}
                      values={{
                        friendliness: booking.rating_helper_friendliness,
                        reliability: booking.rating_helper_reliability,
                        animalCare: booking.rating_helper_animal_care,
                        communication: booking.rating_helper_communication,
                      }}
                    />
                  )
                ) : null}
                {isHelper ? (
                  booking.rating_seeker === null ? (
                    <RatingForm
                      title="Wie war die Zusammenarbeit?"
                      onSubmit={handleRateSeeker}
                      pending={rateSeeker.isPending}
                    />
                  ) : (
                    <RatingSummary
                      overall={booking.rating_seeker}
                      review={booking.review_seeker}
                      values={{
                        friendliness: booking.rating_seeker_friendliness,
                        reliability: booking.rating_seeker_reliability,
                        animalCare: booking.rating_seeker_animal_care,
                        communication: booking.rating_seeker_communication,
                      }}
                    />
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
      <Modal
        animationType="fade"
        onRequestClose={() => setLargePhotoVisible(false)}
        transparent
        visible={largePhotoVisible && booking?.pet?.avatar_url !== undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Großes Tierbild schließen"
          onPress={() => setLargePhotoVisible(false)}
          style={styles.photoModal}
        >
          {booking?.pet?.avatar_url ? (
            <Image source={{ uri: booking.pet.avatar_url }} style={styles.largePhoto} />
          ) : null}
        </Pressable>
      </Modal>
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
  headerMain: { flex: 1, flexShrink: 1, gap: 2 },
  bookingNumber: { fontFamily: appFonts.extrabold, fontSize: 20, lineHeight: 28, flexShrink: 1 },
  groupTitle: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
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
  ratingForm: { marginTop: 4, gap: 12 },
  rateTitle: {
    fontFamily: appFonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  criterionRow: { gap: 6 },
  criterionLabel: { fontFamily: appFonts.semibold, fontSize: 12, lineHeight: 18 },
  rateButtons: { flexDirection: 'row', gap: 8 },
  petPhotoPreview: { alignItems: 'center', marginBottom: 16 },
  petPhoto: { width: 120, height: 120, borderRadius: 20 },
  photoHint: { fontFamily: appFonts.semibold, fontSize: 12, lineHeight: 18, marginTop: 6 },
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  largePhoto: { width: '100%', aspectRatio: 1, borderRadius: 24 },
  rateButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButtonText: { fontFamily: appFonts.bold, fontSize: 15, lineHeight: 20 },
  reviewInput: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  ratingSummary: { gap: 8 },
  summaryOverall: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  reviewText: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
});
