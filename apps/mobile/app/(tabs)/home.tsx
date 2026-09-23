import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useBookings, useTimebankAccount, type BookingWithRelations } from '@pfotennetz/supabase';
import { formatDate, formatTimebankHours, formatTimebankHoursMagnitude } from '@pfotennetz/shared';
import { bookingTypeLabels } from '../../lib/booking';
import {
  highlightHeadings,
  selectBookingPreview,
  selectHighlightedBooking,
} from '../../lib/dashboard';
import {
  ActionButton,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  StatusBadge,
  usePalette,
} from '../../components/ui';

function HighlightCard({
  booking,
  kind,
}: {
  booking: BookingWithRelations;
  kind: 'current' | 'upcoming' | 'open';
}) {
  const c = usePalette();
  return (
    <Card>
      <SectionTitle>{highlightHeadings[kind]}</SectionTitle>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Buchung ${booking.booking_number} öffnen`}
        onPress={() => {
          router.push({ pathname: '/booking/[id]', params: { id: booking.id } });
        }}
        style={styles.highlightBody}
      >
        <Text style={[styles.bookingNumber, { color: c.onSurface }]}>{booking.booking_number}</Text>
        <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>
          {bookingTypeLabels[booking.type]} · {booking.pet?.name ?? '–'}
        </Text>
        <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>
          {formatDate(booking.start_at, {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <View style={styles.badgeWrap}>
          <StatusBadge status={booking.status} />
        </View>
      </Pressable>
    </Card>
  );
}

function PreviewRow({ booking }: { booking: BookingWithRelations }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buchung ${booking.booking_number} öffnen`}
      onPress={() => {
        router.push({ pathname: '/booking/[id]', params: { id: booking.id } });
      }}
      style={[
        styles.row,
        { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant },
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: c.onSurface }]}>{booking.booking_number}</Text>
        <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>
          {bookingTypeLabels[booking.type]} · {booking.pet?.name ?? '–'}
        </Text>
        <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>
          {formatDate(booking.start_at, {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <StatusBadge status={booking.status} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const c = usePalette();
  const bookingsQuery = useBookings();
  const accountQuery = useTimebankAccount();

  const bookings = bookingsQuery.data ?? [];
  const highlighted = selectHighlightedBooking(bookings);
  const preview = selectBookingPreview(bookings);
  const account = accountQuery.data ?? null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.onSurface }]}>Hallo!</Text>
        <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>
          Schön, dass du da bist.
        </Text>

        <Card>
          <SectionTitle>Nachbarschafts-Stunden</SectionTitle>
          {accountQuery.isPending ? (
            <LoadingView label="Kontostand wird geladen …" />
          ) : accountQuery.isError ? (
            <ErrorBox
              message={`Kontostand konnte nicht geladen werden: ${accountQuery.error.message}`}
              onRetry={() => {
                void accountQuery.refetch();
              }}
            />
          ) : account === null ? (
            <EmptyText>
              Noch kein Nachbarschafts-Konto vorhanden. Es wird automatisch angelegt, sobald deine
              erste Buchung abgeschlossen ist.
            </EmptyText>
          ) : (
            <>
              <Text
                style={[
                  styles.balance,
                  { color: Number(account.balance_hours) < 0 ? c.error : c.onSurface },
                ]}
              >
                {formatTimebankHours(Number(account.balance_hours))}
              </Text>
              <InfoRow
                label="Verdient"
                value={formatTimebankHoursMagnitude(Number(account.total_earned_hours))}
              />
              <InfoRow
                label="Ausgegeben"
                value={formatTimebankHoursMagnitude(Number(account.total_spent_hours))}
              />
            </>
          )}
        </Card>

        {bookingsQuery.isPending ? (
          <Card>
            <SectionTitle>Nächste Betreuung</SectionTitle>
            <LoadingView label="Buchungen werden geladen …" />
          </Card>
        ) : bookingsQuery.isError ? (
          <Card>
            <SectionTitle>Nächste Betreuung</SectionTitle>
            <ErrorBox
              message={`Buchungen konnten nicht geladen werden: ${bookingsQuery.error.message}`}
              onRetry={() => {
                void bookingsQuery.refetch();
              }}
            />
          </Card>
        ) : highlighted === null ? (
          <Card>
            <SectionTitle>Nächste Betreuung</SectionTitle>
            <EmptyText>Keine kommenden Betreuungen. Neue Anfragen erscheinen hier.</EmptyText>
          </Card>
        ) : (
          <HighlightCard booking={highlighted.booking} kind={highlighted.kind} />
        )}

        <Card>
          <SectionTitle>Aktuelle Anfragen</SectionTitle>
          {bookingsQuery.isPending ? (
            <LoadingView label="Buchungen werden geladen …" />
          ) : bookingsQuery.isError ? (
            <ErrorBox
              message={`Buchungen konnten nicht geladen werden: ${bookingsQuery.error.message}`}
              onRetry={() => {
                void bookingsQuery.refetch();
              }}
            />
          ) : preview.length === 0 ? (
            <EmptyText>Keine aktuellen Anfragen vorhanden.</EmptyText>
          ) : (
            preview.map((booking) => <PreviewRow key={booking.id} booking={booking} />)
          )}
          <ActionButton
            title="Anfragen anzeigen"
            variant="secondary"
            onPress={() => {
              router.push('/(tabs)/tracking');
            }}
          />
        </Card>

        <Card>
          <SectionTitle>Schnellaktionen</SectionTitle>
          <ActionButton
            title="Anfragen anzeigen"
            variant="secondary"
            onPress={() => {
              router.push('/(tabs)/tracking');
            }}
          />
          <ActionButton
            title="Profil & Nachbarschafts-Konto"
            variant="secondary"
            onPress={() => {
              router.push('/(tabs)/profile');
            }}
          />
          <ActionButton
            title="Karte"
            variant="secondary"
            onPress={() => {
              router.push('/(tabs)/explore');
            }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 16 },
  balance: { fontSize: 36, fontWeight: '800', marginBottom: 8 },
  highlightBody: { gap: 2, minHeight: 48 },
  bookingNumber: { fontSize: 16, fontWeight: '800' },
  rowSub: { fontSize: 13 },
  badgeWrap: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    minHeight: 48,
  },
  rowMain: { flexShrink: 1, flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '800' },
});
