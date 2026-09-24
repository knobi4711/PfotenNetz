import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  KIEZ_RADIUS_OPTIONS,
  deletePasskey,
  listPasskeys,
  signOut,
  useOwnProfile,
  useTimebankAccount,
  useTimebankTransactions,
  useUpdateOwnProfile,
  type NotificationPreferences,
  type KiezRadius,
  type TimebankTransaction,
} from '@pfotennetz/supabase';
import { formatDate, formatTimebankHours, formatTimebankHoursMagnitude } from '@pfotennetz/shared';
import { timebankTxDescription, timebankTxTypeLabels } from '../../lib/booking';
import { AvailabilityManager } from '../../components/helper-availability';
import { HelperStatusCard } from '../../components/helper-status';
import { useTheme, type ThemeMode } from '../../providers/theme';
import {
  friendlyPasskeyError,
  isPasskeySupported,
  registerNativePasskey,
} from '../../lib/passkeys';
import {
  clearStoredCredentials,
  friendlyFingerprintError,
  getFingerprintCapabilities,
  hasStoredCredentials,
} from '../../lib/fingerprint-login';
import {
  ActionButton,
  AppHeader,
  Card,
  EmptyText,
  ErrorBox,
  InfoRow,
  LoadingView,
  SectionTitle,
  appFonts,
  usePalette,
} from '../../components/ui';

function TransactionRow({ tx }: { tx: TimebankTransaction }) {
  const c = usePalette();
  const amount = Number(tx.amount_hours);
  const isPositive = amount >= 0;
  const bookingRef =
    (tx.reference_type === 'booking_earned' || tx.reference_type === 'booking_spent') &&
    tx.reference_id !== null
      ? tx.reference_id
      : null;

  const row = (
    <View style={styles.txRow}>
      <View style={styles.txMain}>
        <Text style={[styles.txType, { color: c.onSurface }]}>{timebankTxTypeLabels[tx.type]}</Text>
        <Text style={[styles.txDate, { color: c.onSurfaceVariant }]}>
          {formatDate(tx.created_at, {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {tx.description.length > 0 ? (
          <Text style={[styles.txDescription, { color: c.onSurfaceVariant }]}>
            {timebankTxDescription(tx)}
          </Text>
        ) : null}
      </View>
      <View style={styles.txAmounts}>
        <Text style={[styles.txAmount, { color: isPositive ? c.success : c.error }]}>
          {formatTimebankHours(amount)}
        </Text>
        <Text style={[styles.txBalance, { color: c.onSurfaceVariant }]}>
          Stand: {formatTimebankHours(Number(tx.balance_after_hours))}
        </Text>
      </View>
    </View>
  );

  if (bookingRef === null) {
    return row;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buchung ${bookingRef} öffnen`}
      onPress={() => {
        router.push({ pathname: '/booking/[id]', params: { id: bookingRef } });
      }}
    >
      {row}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const c = usePalette();
  const theme = useTheme();
  const profileQuery = useOwnProfile();
  const updateProfile = useUpdateOwnProfile();
  const accountQuery = useTimebankAccount();
  const transactionsQuery = useTimebankTransactions();

  const profile = profileQuery.data ?? null;
  const account = accountQuery.data ?? null;
  const transactions = transactionsQuery.data ?? [];

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [kiezRadiusKm, setKiezRadiusKm] = useState<KiezRadius>(1.5);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    hazards: true,
    bookings: true,
    community: true,
  });
  const [formHint, setFormHint] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [passkeys, setPasskeys] = useState<
    { id: string; friendly_name?: string | undefined; created_at: string }[]
  >([]);
  const [passkeysPending, setPasskeysPending] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  // Passkeys stay on iOS – Android uses fingerprint sign-in instead.
  const isAndroid = Platform.OS === 'android';
  const passkeySupported = !isAndroid && isPasskeySupported();
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);
  const [fingerprintPending, setFingerprintPending] = useState(false);
  const [fingerprintError, setFingerprintError] = useState<string | null>(null);

  const loadPasskeys = () => {
    setPasskeysPending(true);
    setPasskeyError(null);
    void listPasskeys()
      .then(setPasskeys)
      .catch((error: unknown) => {
        setPasskeyError(friendlyPasskeyError(error));
      })
      .finally(() => {
        setPasskeysPending(false);
      });
  };

  useEffect(() => {
    if (passkeySupported) loadPasskeys();
  }, [passkeySupported]);

  useEffect(() => {
    if (!isAndroid) {
      return;
    }
    let cancelled = false;
    void getFingerprintCapabilities()
      .then(async (capabilities) => {
        if (cancelled) {
          return;
        }
        setFingerprintAvailable(capabilities.available);
        setFingerprintEnrolled(
          capabilities.available && capabilities.enrolled && (await hasStoredCredentials())
        );
      })
      .catch(() => {
        // Fingerprint section stays hidden when hardware checks fail.
      });
    return () => {
      cancelled = true;
    };
  }, [isAndroid]);

  const confirmDeleteFingerprint = () => {
    Alert.alert(
      'Fingerabdruck-Anmeldung entfernen?',
      'Die Anmeldung mit Fingerabdruck ist danach nicht mehr möglich. Du kannst sie nach der nächsten Passwort-Anmeldung erneut aktivieren.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => {
            setFingerprintPending(true);
            setFingerprintError(null);
            void clearStoredCredentials()
              .then(() => {
                setFingerprintEnrolled(false);
              })
              .catch((error: unknown) => {
                setFingerprintError(friendlyFingerprintError(error));
              })
              .finally(() => {
                setFingerprintPending(false);
              });
          },
        },
      ]
    );
  };

  const handleRegisterPasskey = () => {
    setPasskeysPending(true);
    setPasskeyError(null);
    void registerNativePasskey()
      .then(() => listPasskeys())
      .then(setPasskeys)
      .catch((error: unknown) => {
        setPasskeyError(friendlyPasskeyError(error));
      })
      .finally(() => {
        setPasskeysPending(false);
      });
  };

  const confirmDeletePasskey = (passkeyId: string) => {
    Alert.alert(
      'Passkey entfernen?',
      'Die Anmeldung mit diesem Passkey ist danach nicht mehr möglich.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => {
            setPasskeysPending(true);
            void deletePasskey(passkeyId)
              .then(() => listPasskeys())
              .then(setPasskeys)
              .catch((error: unknown) => {
                setPasskeyError(friendlyPasskeyError(error));
              })
              .finally(() => {
                setPasskeysPending(false);
              });
          },
        },
      ]
    );
  };

  const startEditing = () => {
    setDisplayName(profile?.display_name ?? '');
    setPhone(profile?.phone ?? '');
    const current = Number(profile?.kiez_radius_km ?? 1.5);
    setKiezRadiusKm(
      (KIEZ_RADIUS_OPTIONS as readonly number[]).includes(current) ? (current as KiezRadius) : 1.5
    );
    const prefs = profile?.notification_prefs;
    setNotificationPrefs({
      hazards:
        typeof prefs === 'object' && prefs !== null && 'hazards' in prefs
          ? prefs.hazards === true
          : true,
      bookings:
        typeof prefs === 'object' && prefs !== null && 'bookings' in prefs
          ? prefs.bookings === true
          : true,
      community:
        typeof prefs === 'object' && prefs !== null && 'community' in prefs
          ? prefs.community === true
          : true,
    });
    setFormHint(null);
    setEditing(true);
  };

  const handleSave = () => {
    setFormHint(null);
    updateProfile.mutate(
      { displayName: displayName.trim(), phone, kiezRadiusKm, notificationPrefs },
      {
        onSuccess: () => {
          setEditing(false);
        },
      }
    );
  };

  const handleSignOut = () => {
    setSigningOut(true);
    setSignOutError(null);
    void (async () => {
      try {
        await signOut();
        queryClient.clear();
        router.replace('/(auth)/login');
      } catch (error: unknown) {
        setSignOutError(error instanceof Error ? error.message : 'Abmeldung fehlgeschlagen.');
        setSigningOut(false);
      }
    })();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Mein Profil & Nachbarschaft"
          subtitle="Vertrauen, Verfügbarkeit und Nachbarschafts-Einstellungen."
          avatarLabel={profile?.display_name.slice(0, 1).toUpperCase() || '🐾'}
        />

        {profile?.role === 'admin' ? (
          <Card>
            <SectionTitle>Administration</SectionTitle>
            <EmptyText>Prüfe Gefahrenmeldungen und verwalte aktive Warnungen.</EmptyText>
            <ActionButton
              title="Administration öffnen"
              variant="secondary"
              onPress={() => router.push('/hazard/moderation')}
            />
          </Card>
        ) : null}

        <Card>
          {profileQuery.isPending ? (
            <LoadingView label="Profil wird geladen …" />
          ) : profileQuery.isError ? (
            <ErrorBox
              message={`Profil konnte nicht geladen werden: ${profileQuery.error.message}`}
              onRetry={() => {
                void profileQuery.refetch();
              }}
            />
          ) : profile === null ? (
            <EmptyText>
              Noch kein Profil vorhanden. Es wird bei der Registrierung automatisch angelegt.
            </EmptyText>
          ) : editing ? (
            <>
              <SectionTitle>Profil bearbeiten</SectionTitle>
              <Text style={[styles.label, { color: c.onSurface }]}>Anzeigename</Text>
              <TextInput
                autoCapitalize="words"
                editable={!updateProfile.isPending}
                onChangeText={setDisplayName}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={displayName}
              />
              <Text style={[styles.label, { color: c.onSurface }]}>Telefon (optional)</Text>
              <TextInput
                editable={!updateProfile.isPending}
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="Für Absprachen bei Buchungen"
                placeholderTextColor={c.outline}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={phone}
              />
              <Text style={[styles.label, { color: c.onSurface }]}>Nachbarschafts-Radius</Text>
              <View style={styles.radiusRow}>
                {KIEZ_RADIUS_OPTIONS.map((option) => {
                  const selected = option === kiezRadiusKm;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      disabled={updateProfile.isPending}
                      onPress={() => {
                        setKiezRadiusKm(option);
                      }}
                      style={[
                        styles.radiusChip,
                        {
                          backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                          opacity: updateProfile.isPending ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.radiusText, { color: selected ? c.onPrimary : c.onSurface }]}
                      >
                        {option.toString().replace('.', ',')} km
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.label, { color: c.onSurface }]}>Benachrichtigungen</Text>
              {(
                [
                  ['hazards', 'Akute Gefahren'],
                  ['bookings', 'Betreuungsanfragen'],
                  ['community', 'Community-Events'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: notificationPrefs[key] }}
                  onPress={() =>
                    setNotificationPrefs((current) => ({ ...current, [key]: !current[key] }))
                  }
                  style={styles.preferenceRow}
                >
                  <Text
                    style={[
                      styles.preferenceBox,
                      { color: notificationPrefs[key] ? c.primary : c.outline },
                    ]}
                  >
                    {notificationPrefs[key] ? '☑' : '☐'}
                  </Text>
                  <Text style={[styles.preferenceText, { color: c.onSurface }]}>{label}</Text>
                </Pressable>
              ))}
              {formHint !== null ? (
                <Text style={[styles.hint, { color: c.tertiary }]}>{formHint}</Text>
              ) : null}
              {updateProfile.isError ? (
                <ErrorBox message={`Speichern fehlgeschlagen: ${updateProfile.error.message}`} />
              ) : null}
              <ActionButton
                title="Profil speichern"
                pending={updateProfile.isPending}
                onPress={handleSave}
              />
              <ActionButton
                title="Abbrechen"
                variant="secondary"
                disabled={updateProfile.isPending}
                onPress={() => {
                  setEditing(false);
                }}
              />
            </>
          ) : (
            <>
              <View style={styles.profileHero}>
                <View
                  style={[
                    styles.profileAvatar,
                    { backgroundColor: c.primaryFixed, borderColor: c.surfaceContainerLowest },
                  ]}
                >
                  <Text style={[styles.profileAvatarText, { color: c.primary }]}>
                    {profile.display_name.slice(0, 1).toUpperCase() || '🐾'}
                  </Text>
                </View>
                <View style={styles.profileHeroMain}>
                  <Text style={[styles.profileName, { color: c.onSurface }]}>
                    {profile.display_name}
                  </Text>
                  <View style={styles.trustLine}>
                    <MaterialCommunityIcons name="shield-check" size={16} color={c.secondary} />
                    <Text style={[styles.trustText, { color: c.secondary }]}>
                      Nachbarschafts-Mitglied
                    </Text>
                  </View>
                </View>
              </View>
              <InfoRow label="Name" value={profile.display_name} />
              <InfoRow label="E-Mail" value={profile.email} />
              <InfoRow label="Telefon" value={profile.phone ?? '–'} />
              <InfoRow
                label="Nachbarschafts-Radius"
                value={`${Number(profile.kiez_radius_km).toString().replace('.', ',')} km`}
              />
              <ActionButton title="Profil bearbeiten" variant="secondary" onPress={startEditing} />
            </>
          )}
        </Card>

        {profile !== null && !editing ? (
          <>
            <Card>
              <SectionTitle>Darstellung</SectionTitle>
              <Text style={[styles.passkeyDescription, { color: c.onSurfaceVariant }]}>
                Wähle, ob PfotenNetz dem Gerätemodus folgt oder dauerhaft hell bzw. dunkel angezeigt
                wird.
              </Text>
              <View style={styles.themeOptions}>
                {(
                  [
                    ['system', 'System'],
                    ['light', 'Hell'],
                    ['dark', 'Dunkel'],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: theme.mode === value }}
                    onPress={() => theme.setMode(value as ThemeMode)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: theme.mode === value ? c.primary : c.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themeOptionText,
                        { color: theme.mode === value ? c.onPrimary : c.onSurface },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            <HelperStatusCard profile={profile} />
            <AvailabilityManager />
            {profile.role === 'admin' ? (
              <Card>
                <SectionTitle>Moderation</SectionTitle>
                <Text style={[styles.passkeyDescription, { color: c.onSurfaceVariant }]}>
                  Prüfe neue Gefahrenmeldungen und veröffentliche oder entwarne sie.
                </Text>
                <ActionButton
                  title="Gefahrenmeldungen prüfen"
                  variant="secondary"
                  onPress={() => router.push('/hazard/moderation')}
                />
                <ActionButton
                  title="Community-Events prüfen"
                  variant="secondary"
                  onPress={() => router.push('/community/moderation')}
                />
              </Card>
            ) : null}
          </>
        ) : null}

        {fingerprintAvailable ? (
          <Card>
            <SectionTitle>Fingerabdruck-Anmeldung</SectionTitle>
            <Text style={[styles.passkeyDescription, { color: c.onSurfaceVariant }]}>
              {fingerprintEnrolled
                ? 'Du kannst dich auf diesem Gerät mit deinem Fingerabdruck anmelden, ohne dein Passwort einzugeben.'
                : 'Noch nicht aktiviert. Nach deiner nächsten Anmeldung mit E-Mail und Passwort kannst du sie aktivieren.'}
            </Text>
            {fingerprintError !== null ? <ErrorBox message={fingerprintError} /> : null}
            {fingerprintEnrolled ? (
              <ActionButton
                title="Fingerabdruck-Anmeldung entfernen"
                variant="secondary"
                pending={fingerprintPending}
                onPress={confirmDeleteFingerprint}
              />
            ) : null}
          </Card>
        ) : null}

        {passkeySupported ? (
          <Card>
            <SectionTitle>Passkeys & Biometrie</SectionTitle>
            <Text style={[styles.passkeyDescription, { color: c.onSurfaceVariant }]}>
              Passkeys ermöglichen die Anmeldung mit Face ID, Fingerabdruck oder Geräte-PIN – ohne
              dein Passwort zu speichern.
            </Text>
            {passkeysPending && passkeys.length === 0 ? (
              <LoadingView label="Passkeys werden geladen …" />
            ) : passkeys.length === 0 ? (
              <EmptyText>Noch kein Passkey für dein Konto registriert.</EmptyText>
            ) : (
              passkeys.map((passkey) => (
                <View key={passkey.id} style={styles.passkeyRow}>
                  <View style={styles.passkeyMain}>
                    <Text style={[styles.passkeyName, { color: c.onSurface }]}>
                      {passkey.friendly_name ?? 'Passkey'}
                    </Text>
                    <Text style={[styles.passkeyDate, { color: c.onSurfaceVariant }]}>
                      Erstellt am {formatDate(passkey.created_at)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={passkeysPending}
                    onPress={() => {
                      confirmDeletePasskey(passkey.id);
                    }}
                    style={styles.passkeyDelete}
                  >
                    <Text style={[styles.passkeyDeleteText, { color: c.error }]}>Entfernen</Text>
                  </Pressable>
                </View>
              ))
            )}
            {passkeyError !== null ? <ErrorBox message={passkeyError} /> : null}
            <ActionButton
              title="Passkey hinzufügen"
              variant="secondary"
              pending={passkeysPending}
              onPress={handleRegisterPasskey}
            />
          </Card>
        ) : null}

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

        <Card>
          <SectionTitle>Verlauf</SectionTitle>
          {transactionsQuery.isPending ? (
            <LoadingView label="Verlauf wird geladen …" />
          ) : transactionsQuery.isError ? (
            <ErrorBox
              message={`Verlauf konnte nicht geladen werden: ${transactionsQuery.error.message}`}
              onRetry={() => {
                void transactionsQuery.refetch();
              }}
            />
          ) : transactions.length === 0 ? (
            <EmptyText>Noch keine Bewegungen auf deinem Nachbarschafts-Konto.</EmptyText>
          ) : (
            transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </Card>

        {(accountQuery.isFetching || transactionsQuery.isFetching) &&
        !accountQuery.isPending &&
        !transactionsQuery.isPending ? (
          <EmptyText>Aktualisiere …</EmptyText>
        ) : null}

        <ActionButton
          title="Daten aktualisieren"
          variant="secondary"
          onPress={() => {
            void profileQuery.refetch();
            void accountQuery.refetch();
            void transactionsQuery.refetch();
          }}
        />

        {signOutError !== null ? <ErrorBox message={signOutError} /> : null}
        <ActionButton
          title="Abmelden"
          variant="danger"
          pending={signingOut}
          onPress={handleSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  profileHero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontFamily: appFonts.extrabold, fontSize: 28 },
  profileHeroMain: { flex: 1 },
  profileName: { fontFamily: appFonts.extrabold, fontSize: 20, lineHeight: 28 },
  trustLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  trustText: { fontFamily: appFonts.bold, fontSize: 12, lineHeight: 18 },
  label: {
    fontFamily: appFonts.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: appFonts.regular,
    fontSize: 15,
  },
  hint: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 8 },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  radiusChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  radiusText: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  preferenceBox: { fontSize: 22, lineHeight: 26 },
  preferenceText: { fontFamily: appFonts.regular, fontSize: 14 },
  passkeyDescription: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  passkeyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  passkeyMain: { flex: 1 },
  passkeyName: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  passkeyDate: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16, marginTop: 2 },
  passkeyDelete: { paddingHorizontal: 8, paddingVertical: 10 },
  passkeyDeleteText: { fontFamily: appFonts.bold, fontSize: 12, lineHeight: 18 },
  balance: { fontFamily: appFonts.extrabold, fontSize: 36, lineHeight: 44, marginBottom: 8 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  txMain: { flexShrink: 1, flex: 1, gap: 2 },
  txType: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  txDate: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16 },
  txDescription: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18 },
  txAmounts: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontFamily: appFonts.extrabold, fontSize: 14, lineHeight: 20 },
  txBalance: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16 },
  themeOptions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  themeOption: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12 },
  themeOptionText: { fontFamily: appFonts.bold, fontSize: 13 },
});
