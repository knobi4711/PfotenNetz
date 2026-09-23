import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  notificationDeepLink,
  useBookings,
  useCurrentUser,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationSubscription,
  useUnreadCount,
  type BookingWithRelations,
  type Notification,
} from '@pfotennetz/supabase';
import { formatCurrency, formatDate, formatTimebankHoursMagnitude } from '@pfotennetz/shared';
import { bookingTypeLabels } from '../../lib/booking';
import {
  Card,
  ActionButton,
  AppHeader,
  Chip,
  ChipRow,
  EmptyText,
  ErrorBox,
  LoadingView,
  StatusBadge,
  appFonts,
  usePalette,
} from '../../components/ui';

function priceLabel(booking: BookingWithRelations): string {
  if (booking.currency === 'KIEZ_HOURS') {
    return formatTimebankHoursMagnitude(Number(booking.price_kiez_hours));
  }
  return formatCurrency(booking.price_eur_cents);
}

function roleLabel(booking: BookingWithRelations, currentUserId: string | null): string | null {
  if (currentUserId === null) return null;
  if (booking.helper_id !== null && booking.helper_id === currentUserId) return 'Du hilfst';
  if (booking.seeker_id === currentUserId) return 'Deine Anfrage';
  return null;
}

function BookingRow({
  booking,
  currentUserId,
}: {
  booking: BookingWithRelations;
  currentUserId: string | null;
}) {
  const c = usePalette();
  const role = roleLabel(booking, currentUserId);
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
          {role !== null ? ` · ${role}` : ''}
        </Text>
        <Text style={[styles.price, { color: c.onSurface }]}>{priceLabel(booking)}</Text>
      </View>
      <StatusBadge status={booking.status} />
    </Pressable>
  );
}

export default function TrackingScreen() {
  const c = usePalette();
  const bookingsQuery = useBookings();
  const userQuery = useCurrentUser();
  useNotificationSubscription();
  const notificationsQuery = useNotifications();
  const unreadQuery = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<'all' | 'toMe' | 'mine'>('all');

  const bookings = bookingsQuery.data ?? [];
  const currentUserId = userQuery.data?.id ?? null;
  const notifications = notificationsQuery.data ?? [];
  const unread = unreadQuery.data ?? 0;

  const visibleBookings = bookings.filter((booking) => {
    if (filter === 'all' || currentUserId === null) return true;
    if (filter === 'toMe') return booking.helper_id !== null && booking.helper_id === currentUserId;
    return booking.seeker_id === currentUserId;
  });

  const openNotification = (notification: Notification) => {
    if (notification.read_at === null) {
      markRead.mutate(notification.id);
    }
    const url = notificationDeepLink(notification);
    if (url !== null) {
      router.push(url);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Anfragen & Betreuung"
          subtitle={unread > 0 ? `${unread} neue Mitteilungen warten auf dich.` : 'Alles im Blick.'}
          hasNotifications={unread > 0}
        />
        <ActionButton
          title="Neue Anfrage"
          onPress={() => {
            router.push('/booking/new');
          }}
        />

        <ChipRow>
          {(
            [
              { value: 'all', label: 'Alle' },
              { value: 'toMe', label: 'An mich' },
              { value: 'mine', label: 'Meine Anfragen' },
            ] as const
          ).map((option) => {
            const selected = filter === option.value;
            return (
              <Chip
                key={option.value}
                label={option.label}
                selected={selected}
                onPress={() => {
                  setFilter(option.value);
                }}
              />
            );
          })}
        </ChipRow>

        {bookingsQuery.isPending ? (
          <LoadingView label="Buchungen werden geladen …" />
        ) : bookingsQuery.isError ? (
          <ErrorBox
            message={`Buchungen konnten nicht geladen werden: ${bookingsQuery.error.message}`}
            onRetry={() => {
              void bookingsQuery.refetch();
            }}
          />
        ) : bookings.length === 0 ? (
          <Card>
            <EmptyText>
              {currentUserId === null
                ? 'Melde dich an, um deine Buchungen zu sehen.'
                : 'Noch keine Buchungen vorhanden. Neue Anfragen erscheinen hier.'}
            </EmptyText>
          </Card>
        ) : visibleBookings.length === 0 ? (
          <Card>
            <EmptyText>Für diesen Filter gibt es aktuell keine Buchungen.</EmptyText>
          </Card>
        ) : (
          visibleBookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} currentUserId={currentUserId} />
          ))
        )}

        <Card>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, { color: c.onSurface }]}>
              Mitteilungen{unread > 0 ? ` (${unread} neu)` : ''}
            </Text>
            {unread > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alle Mitteilungen als gelesen markieren"
                disabled={markAllRead.isPending}
                onPress={() => {
                  markAllRead.mutate();
                }}
              >
                <Text style={[styles.markAll, { color: c.primary }]}>Alle gelesen</Text>
              </Pressable>
            ) : null}
          </View>
          {notificationsQuery.isPending ? (
            <LoadingView label="Mitteilungen werden geladen …" />
          ) : notificationsQuery.isError ? (
            <ErrorBox
              message={`Mitteilungen konnten nicht geladen werden: ${notificationsQuery.error.message}`}
              onRetry={() => {
                void notificationsQuery.refetch();
              }}
            />
          ) : notifications.length === 0 ? (
            <EmptyText>
              Noch keine Mitteilungen. Bei Anfragen, Bestätigungen und Stornierungen erhältst du
              hier automatisch Nachricht.
            </EmptyText>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <Pressable
                key={notification.id}
                accessibilityRole="button"
                onPress={() => {
                  openNotification(notification);
                }}
                style={styles.notifRow}
              >
                <View
                  style={[
                    styles.notifDot,
                    {
                      backgroundColor: notification.read_at === null ? c.primary : c.outlineVariant,
                    },
                  ]}
                />
                <View style={styles.notifMain}>
                  <Text style={[styles.notifSubject, { color: c.onSurface }]}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.notifBody, { color: c.onSurfaceVariant }]}>
                    {notification.body}
                  </Text>
                  <Text style={[styles.notifDate, { color: c.onSurfaceVariant }]}>
                    {formatDate(notification.created_at, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    minHeight: 48,
  },
  rowMain: { flexShrink: 1, flex: 1, gap: 2 },
  bookingNumber: { fontFamily: appFonts.bold, fontSize: 15, lineHeight: 20 },
  rowSub: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18 },
  price: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18, marginTop: 4 },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notifTitle: { fontFamily: appFonts.bold, fontSize: 18, lineHeight: 24 },
  markAll: { fontFamily: appFonts.bold, fontSize: 12, lineHeight: 18 },
  notifRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  notifMain: { flex: 1, flexShrink: 1, gap: 2 },
  notifSubject: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  notifBody: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20 },
  notifDate: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16 },
});
