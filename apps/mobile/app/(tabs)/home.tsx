import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useBookings,
  useOwnPets,
  useOwnProfile,
  useTimebankAccount,
  useUnreadCount,
  type BookingWithRelations,
  type Pet,
} from '@pfotennetz/supabase';
import { formatDate, formatTimebankHours, formatTimebankHoursMagnitude } from '@pfotennetz/shared';
import { bookingTypeLabels } from '../../lib/booking';
import {
  highlightHeadings,
  selectBookingPreview,
  selectHighlightedBooking,
} from '../../lib/dashboard';
import {
  ActionButton,
  AlertBanner,
  AppHeader,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  StatusBadge,
  appFonts,
  usePalette,
} from '../../components/ui';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Hallo';
  return 'Guten Abend';
}

function petEmoji(pet: Pet): string {
  if (pet.species === 'cat') return '🐱';
  if (pet.species === 'dog') return '🐶';
  return '🐾';
}

function HighlightCard({
  booking,
  kind,
}: {
  booking: BookingWithRelations;
  kind: 'current' | 'upcoming' | 'open';
}) {
  const c = usePalette();
  return (
    <Card accentColor={kind === 'current' ? c.success : c.primary}>
      <View style={styles.highlightHeading}>
        <View>
          <Text style={[styles.eyebrow, { color: kind === 'current' ? c.success : c.primary }]}>
            {kind === 'current' ? 'LIVE' : 'NÄCHSTER TERMIN'}
          </Text>
          <SectionTitle>{highlightHeadings[kind]}</SectionTitle>
        </View>
        <StatusBadge status={booking.status} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Buchung ${booking.booking_number} öffnen`}
        onPress={() => {
          router.push({ pathname: '/booking/[id]', params: { id: booking.id } });
        }}
        style={styles.highlightBody}
      >
        <View style={styles.bookingSummary}>
          <View style={[styles.bookingIcon, { backgroundColor: c.secondaryFixed }]}>
            <MaterialCommunityIcons name="dog-side" size={24} color={c.secondary} />
          </View>
          <View style={styles.rowMain}>
            <Text style={[styles.bookingNumber, { color: c.onSurface }]}>
              {bookingTypeLabels[booking.type]} mit {booking.pet?.name ?? 'deinem Tier'}
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
          <MaterialCommunityIcons name="chevron-right" size={22} color={c.outline} />
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
  const profileQuery = useOwnProfile();
  const petsQuery = useOwnPets();
  const unreadQuery = useUnreadCount();

  const bookings = bookingsQuery.data ?? [];
  const highlighted = selectHighlightedBooking(bookings);
  const preview = selectBookingPreview(bookings);
  const account = accountQuery.data ?? null;
  const disputed = bookings.find((booking) => booking.status === 'disputed') ?? null;
  const firstName = profileQuery.data?.display_name.trim().split(/\s+/)[0] ?? '';
  const avatarLabel = firstName.slice(0, 1).toUpperCase() || '🐾';
  const pets = petsQuery.data ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title={`${greeting()}${firstName.length > 0 ? `, ${firstName}` : ''}!`}
          subtitle="Was steht heute im PfotenNetz an?"
          avatarLabel={avatarLabel}
          hasNotifications={(unreadQuery.data ?? 0) > 0}
          onNotifications={() => {
            router.push('/(tabs)/tracking');
          }}
        />

        {disputed !== null ? (
          <AlertBanner
            title="Strittige Buchung"
            message={`Die Buchung ${disputed.booking_number} benötigt deine Aufmerksamkeit.`}
            actionLabel="Details ansehen"
            onAction={() => {
              router.push({ pathname: '/booking/[id]', params: { id: disputed.id } });
            }}
          />
        ) : null}

        <View style={styles.sectionHeading}>
          <SectionTitle>Aktuelle Betreuungen</SectionTitle>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push('/(tabs)/tracking');
            }}
          >
            <Text style={[styles.sectionLink, { color: c.primary }]}>Alle anzeigen</Text>
          </Pressable>
        </View>

        {bookingsQuery.isPending ? (
          <Card>
            <LoadingView label="Buchungen werden geladen …" />
          </Card>
        ) : bookingsQuery.isError ? (
          <Card>
            <ErrorBox
              message={`Buchungen konnten nicht geladen werden: ${bookingsQuery.error.message}`}
              onRetry={() => {
                void bookingsQuery.refetch();
              }}
            />
          </Card>
        ) : highlighted === null ? (
          <Card>
            <EmptyText>Keine kommenden Betreuungen. Neue Anfragen erscheinen hier.</EmptyText>
          </Card>
        ) : (
          <HighlightCard booking={highlighted.booking} kind={highlighted.kind} />
        )}

        <View style={styles.sectionHeading}>
          <SectionTitle>Meine Haustiere</SectionTitle>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push('/(tabs)/pets');
            }}
          >
            <Text style={[styles.sectionLink, { color: c.primary }]}>Verwalten</Text>
          </Pressable>
        </View>
        {petsQuery.isPending ? (
          <LoadingView label="Tiere werden geladen …" />
        ) : pets.length === 0 ? (
          <Card>
            <EmptyText>Lege dein erstes Tier an, um Betreuung zu buchen.</EmptyText>
            <ActionButton
              title="Tier hinzufügen"
              variant="secondary"
              onPress={() => {
                router.push('/(tabs)/pets');
              }}
            />
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petRail}
            style={styles.petRailWrap}
          >
            {pets.map((pet) => (
              <Pressable
                key={pet.id}
                accessibilityRole="button"
                onPress={() => {
                  router.push('/(tabs)/pets');
                }}
                style={[
                  styles.petCard,
                  { backgroundColor: c.surfaceContainerLowest, borderColor: `${c.outline}22` },
                ]}
              >
                <View style={[styles.petPortrait, { backgroundColor: c.primaryFixed }]}>
                  {pet.avatar_url !== null ? (
                    <Image source={{ uri: pet.avatar_url }} style={styles.petPortraitImage} />
                  ) : (
                    <Text style={styles.petEmoji}>{petEmoji(pet)}</Text>
                  )}
                </View>
                <Text style={[styles.petName, { color: c.onSurface }]}>{pet.name}</Text>
                <Text style={[styles.petMeta, { color: c.onSurfaceVariant }]}>
                  {pet.breed ?? 'PfotenNetz-Mitglied'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Card>
          <SectionTitle>Nachbarschafts-Sicherheit</SectionTitle>
          <Text style={[styles.petMeta, { color: c.onSurfaceVariant }]}>
            Aktive Gefahren in deiner Nähe prüfen oder eine Warnung melden.
          </Text>
          <ActionButton
            title="Gefahrenradar öffnen"
            variant="secondary"
            onPress={() => {
              router.push('/hazard/radar');
            }}
          />
        </Card>

        <Card>
          <View style={styles.balanceHeading}>
            <View style={[styles.balanceIcon, { backgroundColor: c.secondaryFixed }]}>
              <MaterialCommunityIcons name="hand-heart" size={22} color={c.secondary} />
            </View>
            <SectionTitle>Nachbarschafts-Stunden</SectionTitle>
          </View>
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

        <ActionButton
          title="Neue Betreuung buchen"
          onPress={() => {
            router.push('/booking/new');
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionLink: { fontFamily: appFonts.bold, fontSize: 12, lineHeight: 18 },
  balanceHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  balance: { fontFamily: appFonts.extrabold, fontSize: 36, lineHeight: 44, marginBottom: 8 },
  highlightHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: { fontFamily: appFonts.extrabold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8 },
  highlightBody: { gap: 4, minHeight: 48 },
  bookingSummary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingNumber: { fontFamily: appFonts.bold, fontSize: 15, lineHeight: 20 },
  rowSub: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18 },
  petRailWrap: { marginHorizontal: -16, marginBottom: 20 },
  petRail: { paddingHorizontal: 16, gap: 12 },
  petCard: { width: 146, borderRadius: 20, borderWidth: 1, padding: 10 },
  petPortrait: { height: 92, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  petPortraitImage: { width: '100%', height: '100%', borderRadius: 15 },
  petEmoji: { fontSize: 42 },
  petName: { fontFamily: appFonts.bold, fontSize: 15, lineHeight: 20, marginTop: 9 },
  petMeta: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16 },
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
  rowTitle: { fontFamily: appFonts.bold, fontSize: 15, lineHeight: 20 },
});
