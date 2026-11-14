import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useQueryClient } from '@tanstack/react-query';
import {
  KIEZ_RADIUS_OPTIONS,
  getSupabaseClient,
  deletePasskey,
  listPasskeys,
  signOut,
  useOwnPets,
  useOwnProfile,
  useOwnContactRequests,
  type ContactRequestWithProfiles,
  useCancelContactRequest,
  useRespondContactRequest,
  useTimebankAccount,
  useTimebankTransactions,
  useUpdateOwnProfile,
  useUploadOwnAvatar,
  type NotificationPreferences,
  type KiezRadius,
  type TimebankTransaction,
} from '@pfotennetz/supabase';
import {
  formatDate,
  formatTimebankHours,
  formatTimebankHoursMagnitude,
  petHomeLabel,
} from '@pfotennetz/shared';
import { timebankTxDescription, timebankTxTypeLabels } from '../../lib/booking';
import { AvailabilityManager } from '../../components/helper-availability';
import { HelperStatusCard } from '../../components/helper-status';
import { PetHomeCard } from '../../components/helper-location';
import { openOnboarding } from '../../lib/onboarding';
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
      accessibilityLabel={`Betreuung ${bookingRef} öffnen`}
      onPress={() => {
        router.push({ pathname: '/booking/[id]', params: { id: bookingRef } });
      }}
    >
      {row}
    </Pressable>
  );
}

function ContactRequestRow({
  request,
  ownId,
  onRespond,
  onCancel,
  pending,
}: {
  request: ContactRequestWithProfiles;
  ownId: string;
  onRespond: (requestId: string, status: 'accepted' | 'declined') => void;
  onCancel: (requestId: string) => void;
  pending: boolean;
}) {
  const c = usePalette();
  const isIncoming = request.helper_id === ownId;
  const statusLabel = {
    pending: 'Offen',
    accepted: 'Angenommen',
    declined: 'Abgelehnt',
    cancelled: 'Zurückgezogen',
  }[request.status];

  return (
    <View style={styles.contactRequestRow}>
      <Text style={[styles.contactRequestTitle, { color: c.onSurface }]}>
        {isIncoming
          ? `Anfrage von ${request.requesterProfile?.display_name ?? 'Nachbar:in'}`
          : `Deine Anfrage an ${request.helperProfile?.display_name ?? 'Helfer:in'}`}
      </Text>
      <Text style={[styles.contactRequestMessage, { color: c.onSurfaceVariant }]}>
        {request.message}
      </Text>
      <Text style={[styles.contactRequestStatus, { color: c.secondary }]}>
        {statusLabel} · {formatDate(request.created_at)}
      </Text>
      {request.status === 'pending' || request.status === 'accepted' ? (
        <View style={styles.contactRequestActions}>
          <ActionButton
            title="Privater Chat"
            variant="secondary"
            disabled={pending}
            onPress={() =>
              router.push({
                pathname: '/chat/contact/[contactRequestId]',
                params: { contactRequestId: request.id },
              })
            }
          />
          {isIncoming ? (
            request.status === 'pending' ? (
              <>
                <ActionButton
                  title="Annehmen"
                  pending={pending}
                  onPress={() => onRespond(request.id, 'accepted')}
                />
                <ActionButton
                  title="Ablehnen"
                  variant="secondary"
                  disabled={pending}
                  onPress={() => onRespond(request.id, 'declined')}
                />
              </>
            ) : null
          ) : request.status === 'pending' ? (
            <ActionButton
              title="Zurückziehen"
              variant="secondary"
              pending={pending}
              onPress={() => onCancel(request.id)}
            />
          ) : (
            <ActionButton
              title="Betreuung anfragen"
              pending={pending}
              onPress={() =>
                router.push({
                  pathname: '/booking/new',
                  params: { helperId: request.helper_id },
                })
              }
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const c = usePalette();
  const theme = useTheme();
  const { edit: editParam, section: sectionParam } = useLocalSearchParams<{
    edit?: string;
    section?: string;
  }>();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const pendingSection = useRef<string | null>(null);
  const handledDeepLink = useRef<string | null>(null);
  const profileQuery = useOwnProfile();
  const petsQuery = useOwnPets();
  const homeLabel = petHomeLabel(petsQuery.data ?? []);
  const updateProfile = useUpdateOwnProfile();
  const uploadAvatar = useUploadOwnAvatar();
  const accountQuery = useTimebankAccount();
  const transactionsQuery = useTimebankTransactions();
  const contactRequestsQuery = useOwnContactRequests();
  const respondContactRequest = useRespondContactRequest();
  const cancelContactRequest = useCancelContactRequest();

  const profile = profileQuery.data ?? null;
  const account = accountQuery.data ?? null;
  const transactions = transactionsQuery.data ?? [];
  const contactRequests = contactRequestsQuery.data ?? [];
  const ownId = profile?.id ?? '';

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileBio, setProfileBio] = useState('');
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
  const avatarUrl = profile?.avatar_url
    ? getSupabaseClient().storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
    : null;
  const selectAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    uploadAvatar.mutate({
      fileData: await new File(asset.uri).arrayBuffer(),
      contentType: asset.mimeType ?? 'image/jpeg',
    });
  };

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

  const startEditing = useCallback(() => {
    setDisplayName(profile?.display_name ?? '');
    setPhone(profile?.phone ?? '');
    setProfileBio(profile?.profile_bio ?? '');
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
  }, [profile]);

  // The first-run assistant deep links into a specific part of this screen.
  const scrollToSection = useCallback((section: string) => {
    const offset = sectionOffsets.current[section];
    if (offset === undefined) return false;
    scrollRef.current?.scrollTo({ y: Math.max(0, offset - 16), animated: true });
    return true;
  }, []);

  const rememberSection = useCallback((section: string, offset: number) => {
    sectionOffsets.current[section] = offset;
    if (pendingSection.current !== section) return;
    pendingSection.current = null;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, offset - 16), animated: true });
    }, 80);
  }, []);

  useEffect(() => {
    if (profile === null) return;
    const key = `${editParam ?? ''}|${sectionParam ?? ''}`;
    if (key === '|') {
      handledDeepLink.current = null;
      return;
    }
    if (handledDeepLink.current === key) return;
    handledDeepLink.current = key;
    if (editParam === '1') {
      startEditing();
      return;
    }
    if (sectionParam === undefined) return;
    // The card may still be measuring; its onLayout retries this scroll.
    pendingSection.current = sectionParam;
    const timer = setTimeout(() => {
      if (scrollToSection(sectionParam)) pendingSection.current = null;
    }, 200);
    return () => {
      clearTimeout(timer);
    };
  }, [profile, editParam, sectionParam, startEditing, scrollToSection]);

  const handleSave = () => {
    setFormHint(null);
    if (profile === null) return;
    if (!/^\d{5}$/.test(profile.postal_code ?? '') || !(profile.private_address ?? '').trim()) {
      setFormHint(
        `Es ist noch keine Adresse vorhanden. Lege zuerst dein ${homeLabel} im Profil fest und bearbeite es danach erneut – die Adresse wird hier nicht geändert.`
      );
      return;
    }
    updateProfile.mutate(
      {
        displayName: displayName.trim(),
        phone,
        // Adresse bewusst unverändert: sie wird ausschließlich im Tier-Zuhause gesetzt.
        postalCode: profile.postal_code ?? '',
        privateAddress: profile.private_address ?? '',
        profileBio,
        kiezRadiusKm,
        notificationPrefs,
      },
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
      <ScrollView contentContainerStyle={styles.content} ref={scrollRef}>
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
              title="Helper-Anfragen prüfen"
              variant="secondary"
              onPress={() => router.push('/admin/verifications')}
            />
            <ActionButton
              title="Gefahrenmeldungen prüfen"
              variant="secondary"
              onPress={() => router.push('/hazard/moderation')}
            />
          </Card>
        ) : null}

        <Card>
          <SectionTitle>Mein Profil</SectionTitle>
          <EmptyText>Verwalte dein Profil oder öffne deine Tierprofile.</EmptyText>
          <ActionButton
            title="Zu meinen Tieren"
            variant="secondary"
            onPress={() => router.push('/(tabs)/pets')}
          />
        </Card>

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
                accessibilityLabel="Anzeigename"
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
                accessibilityLabel="Telefonnummer, optional"
                editable={!updateProfile.isPending}
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="Für Absprachen bei Betreuungen"
                placeholderTextColor={c.placeholder}
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
              <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
                Postleitzahl und Wohnadresse werden nicht mehr hier eingegeben: Du legst sie
                einmalig im Abschnitt „{homeLabel}“ fest und änderst sie dort auch.
              </Text>
              <Text style={[styles.label, { color: c.onSurface }]}>Kurzvorstellung (optional)</Text>
              <TextInput
                accessibilityLabel="Kurzvorstellung, optional"
                editable={!updateProfile.isPending}
                multiline
                maxLength={500}
                onChangeText={setProfileBio}
                placeholder="Wer bist du und was kannst du anbieten?"
                placeholderTextColor={c.placeholder}
                style={[
                  styles.input,
                  styles.bioInput,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: c.outlineVariant,
                    color: c.onSurface,
                  },
                ]}
                value={profileBio}
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
              <Text style={[styles.hint, { color: c.onSurfaceVariant }]}>
                Bestimmt, wer deine offenen Anfragen sieht, die Statistik in deiner Umgebung und den
                Startradius der Helfersuche.
              </Text>
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
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={[styles.hint, { color: c.warningText }]}
                >
                  {formHint}
                </Text>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Profilfoto ändern"
                  onPress={() => void selectAvatar()}
                  style={[
                    styles.profileAvatar,
                    { backgroundColor: c.primaryFixed, borderColor: c.surfaceContainerLowest },
                  ]}
                >
                  {avatarUrl ? (
                    <Image
                      accessible={false}
                      source={{ uri: avatarUrl }}
                      style={styles.profileAvatarImage}
                    />
                  ) : (
                    <Text style={[styles.profileAvatarText, { color: c.primary }]}>
                      {profile.display_name.slice(0, 1).toUpperCase() || '🐾'}
                    </Text>
                  )}
                </Pressable>
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
                label="Region"
                value={profile.postal_code ? profile.postal_code : 'Noch nicht bestätigt'}
              />
              {profile.profile_bio ? (
                <InfoRow label="Über mich" value={profile.profile_bio} />
              ) : null}
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
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Darstellung"
                style={styles.themeOptions}
              >
                {(
                  [
                    ['system', 'System'],
                    ['light', 'Hell'],
                    ['dark', 'Dunkel'],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: theme.mode === value }}
                    onPress={() => theme.setMode(value as ThemeMode)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: theme.mode === value ? c.primary : c.surfaceContainerHigh,
                      },
                    ]}
                  >
                    {theme.mode === value ? (
                      <MaterialCommunityIcons name="check" size={16} color={c.onPrimary} />
                    ) : null}
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
            <Card>
              <SectionTitle>Einführung</SectionTitle>
              <EmptyText>
                Profil, Tierprofil und Helferprofil in drei Schritten – jederzeit erneut ansehen.
              </EmptyText>
              <ActionButton
                title="Einführung erneut ansehen"
                variant="secondary"
                onPress={() => openOnboarding('intro')}
              />
            </Card>
            <HelperStatusCard profile={profile} />
            <View
              onLayout={(event) => {
                rememberSection('standort', event.nativeEvent.layout.y);
              }}
            >
              <PetHomeCard profile={profile} />
            </View>
            <View
              onLayout={(event) => {
                rememberSection('helfer', event.nativeEvent.layout.y);
              }}
            >
              <AvailabilityManager />
            </View>
            <Card>
              <SectionTitle>Kennenlernanfragen</SectionTitle>
              {contactRequestsQuery.isPending ? (
                <LoadingView label="Anfragen werden geladen …" />
              ) : contactRequestsQuery.isError ? (
                <ErrorBox
                  message={`Anfragen konnten nicht geladen werden: ${contactRequestsQuery.error.message}`}
                  onRetry={() => void contactRequestsQuery.refetch()}
                />
              ) : contactRequests.length === 0 ? (
                <EmptyText>Noch keine unverbindlichen Kennenlernanfragen.</EmptyText>
              ) : (
                contactRequests.map((request) => (
                  <ContactRequestRow
                    key={request.id}
                    request={request}
                    ownId={ownId}
                    pending={respondContactRequest.isPending || cancelContactRequest.isPending}
                    onRespond={(requestId, status) =>
                      respondContactRequest.mutate(
                        { requestId, status },
                        { onSuccess: () => void contactRequestsQuery.refetch() }
                      )
                    }
                    onCancel={(requestId) =>
                      cancelContactRequest.mutate(requestId, {
                        onSuccess: () => void contactRequestsQuery.refetch(),
                      })
                    }
                  />
                ))
              )}
            </Card>
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
              erste Betreuung abgeschlossen ist.
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
            void contactRequestsQuery.refetch();
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
  profileAvatarImage: { width: '100%', height: '100%', borderRadius: 34 },
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
  bioInput: { minHeight: 86, paddingTop: 14, textAlignVertical: 'top' },
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
  contactRequestRow: { paddingVertical: 10, gap: 5 },
  contactRequestTitle: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  contactRequestMessage: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 19 },
  contactRequestStatus: { fontFamily: appFonts.regular, fontSize: 11, lineHeight: 16 },
  contactRequestActions: { gap: 8, marginTop: 4 },
  themeOptions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    paddingVertical: 12,
  },
  themeOptionText: { fontFamily: appFonts.bold, fontSize: 13 },
});
