import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import {
  KIEZ_RADIUS_OPTIONS,
  useUpdateOwnLocation,
  useUpdateOwnProfile,
  type KiezRadius,
  type NotificationPreferences,
  type Profile,
} from '@pfotennetz/supabase';
import {
  reverseGeocodeOpenStreetMap,
  searchOpenStreetMap,
  type GeocodingAddress,
} from '@pfotennetz/shared';
import { ActionButton, Card, InfoRow, SectionTitle, appFonts, usePalette } from './ui';

interface LocationCandidate {
  latitude: number;
  longitude: number;
  displayName: string;
  address?: GeocodingAddress;
  source: 'gps' | 'search';
}

function buildProfileAddress(
  address: GeocodingAddress | undefined
): { street: string; postalCode: string; city: string } | null {
  const street = address?.street?.trim() ?? '';
  const postalCode = address?.postalCode?.trim() ?? '';
  const city = address?.city?.trim() ?? '';
  if (!street || !/^\d{5}$/.test(postalCode) || !city) return null;
  return { street, postalCode, city };
}

const PREF_KEYS = ['hazards', 'bookings', 'community'] as const;

function readNotificationPrefs(profile: Profile): NotificationPreferences {
  const prefs = profile.notification_prefs as Record<string, unknown> | null | undefined;
  const result: NotificationPreferences = { hazards: true, bookings: true, community: true };
  if (typeof prefs !== 'object' || prefs === null || Array.isArray(prefs)) return result;
  for (const key of PREF_KEYS) {
    if (key in prefs) result[key] = prefs[key] === true;
  }
  return result;
}

/**
 * Vermittlungsstandort: die einzige Stelle, an der GPS-Position und Profiladresse
 * gesetzt werden. Hyperlokale Koordinaten bleiben privat, die Adresse wird nur
 * bei bestätigter Betreuung geteilt.
 */
export function VermittlungsstandortCard({ profile }: { profile: Profile }) {
  const c = usePalette();
  const updateLocation = useUpdateOwnLocation();
  const updateProfile = useUpdateOwnProfile();
  const [candidate, setCandidate] = useState<LocationCandidate | null>(null);
  const [addressPending, setAddressPending] = useState(false);
  const [locationPending, setLocationPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPending, setSearchPending] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof searchOpenStreetMap>>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = updateLocation.isPending || updateProfile.isPending || locationPending;

  const applyCandidate = (next: LocationCandidate) => {
    setCandidate(next);
    setError(null);
    if (buildProfileAddress(next.address)) return;
    // Ermittelt nach, damit Adresse und Standort gemeinsam gespeichert werden können.
    setAddressPending(true);
    void reverseGeocodeOpenStreetMap(next.latitude, next.longitude)
      .then((reverse) => {
        setCandidate((current) => {
          if (
            current === null ||
            current.latitude !== next.latitude ||
            current.longitude !== next.longitude
          ) {
            return current;
          }
          return reverse.address ? { ...current, address: reverse.address } : current;
        });
      })
      .catch(() => {
        // Die Position kann auch ohne aufgelöste Straßenadresse gespeichert werden.
      })
      .finally(() => setAddressPending(false));
  };

  const locate = () => {
    setCandidate(null);
    setMessage(null);
    setError(null);
    setLocationPending(true);
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Standortfreigabe wurde nicht erteilt.');
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = position.coords;
        let displayName = `Koordinaten ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        let address: GeocodingAddress | undefined;
        try {
          const reverse = await reverseGeocodeOpenStreetMap(latitude, longitude);
          displayName = reverse.displayName;
          address = reverse.address;
        } catch {
          // Koordinaten können auch ohne Reverse-Geocoding bestätigt werden.
        }
        applyCandidate({
          latitude,
          longitude,
          displayName,
          ...(address ? { address } : {}),
          source: 'gps',
        });
      } catch (caught: unknown) {
        setError(
          caught instanceof Error ? caught.message : 'Standort konnte nicht ermittelt werden.'
        );
      } finally {
        setLocationPending(false);
      }
    })();
  };

  const search = () => {
    setError(null);
    setSearchPending(true);
    void searchOpenStreetMap(searchQuery)
      .then((results) => {
        setSearchResults(results);
        if (results.length === 0) setError('Kein passender Ort gefunden.');
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Ort konnte nicht gesucht werden.')
      )
      .finally(() => setSearchPending(false));
  };

  const dismissCandidate = () => {
    setCandidate(null);
    setSearchResults([]);
  };

  const confirmCandidate = () => {
    if (candidate === null || addressPending) return;
    const confirmedAddress = buildProfileAddress(candidate.address);
    setMessage(null);
    setError(null);
    void (async () => {
      try {
        await updateLocation.mutateAsync({
          latitude: candidate.latitude,
          longitude: candidate.longitude,
        });
        if (confirmedAddress === null) {
          setCandidate(null);
          setError(
            'Der Vermittlungsstandort wurde gespeichert, aber die Profiladresse ist noch unvollständig. Bitte bestimme den Standort erneut oder wähle den Ort über die Ortssuche.'
          );
          return;
        }
        const currentRadius = Number(profile.kiez_radius_km);
        await updateProfile.mutateAsync({
          displayName: profile.display_name,
          phone: profile.phone,
          postalCode: confirmedAddress.postalCode,
          privateAddress: `${confirmedAddress.street}, ${confirmedAddress.postalCode} ${confirmedAddress.city}`,
          profileBio: profile.profile_bio,
          kiezRadiusKm: ((KIEZ_RADIUS_OPTIONS as readonly number[]).includes(currentRadius)
            ? currentRadius
            : 1.5) as KiezRadius,
          notificationPrefs: readNotificationPrefs(profile),
        });
        setCandidate(null);
        setSearchResults([]);
        setMessage(
          'Standort und Adresse wurden übernommen. Die genaue Position wird in Suchergebnissen nur gerundet verwendet.'
        );
      } catch (caught: unknown) {
        setError(
          caught instanceof Error ? caught.message : 'Standort konnte nicht gespeichert werden.'
        );
      }
    })();
  };

  const confirmedAddress = candidate !== null ? buildProfileAddress(candidate.address) : null;

  return (
    <Card>
      <SectionTitle>Vermittlungsstandort</SectionTitle>
      <Text style={[styles.description, { color: c.onSurfaceVariant }]}>
        Bestimme deine Position per GPS oder wähle einen Ort aus. Standort und Profiladresse werden
        gemeinsam gespeichert – an dieser Stelle und nirgendwo sonst.
      </Text>
      <InfoRow
        label="Hinterlegte Profiladresse"
        value={profile.private_address?.trim() || 'Noch keine hinterlegt'}
      />
      <InfoRow
        label="Letzte Standort-Aktualisierung"
        value={
          profile.location_updated_at !== null
            ? new Date(profile.location_updated_at).toLocaleDateString('de-DE')
            : 'Noch nicht gespeichert'
        }
      />

      <ActionButton
        title={locationPending ? 'Standort wird ermittelt …' : 'Standort ermitteln (GPS)'}
        variant="secondary"
        pending={pending}
        onPress={locate}
      />

      {candidate !== null ? (
        <View
          style={[styles.candidateBox, { borderColor: c.primary, backgroundColor: c.primaryFixed }]}
        >
          <Text style={[styles.candidateTitle, { color: c.onSurface }]}>Bitte Standort prüfen</Text>
          <Text style={[styles.candidateText, { color: c.onSurfaceVariant }]}>
            {candidate.source === 'gps'
              ? `Das Gerät meldet: ${candidate.displayName}`
              : `Ausgewählt: ${candidate.displayName}`}
          </Text>
          {addressPending ? (
            <Text style={[styles.candidateText, { color: c.onSurfaceVariant }]}>
              Straßenadresse wird ermittelt …
            </Text>
          ) : confirmedAddress !== null ? (
            <Text style={[styles.candidateText, { color: c.onSurface }]}>
              Wird als Profiladresse übernommen: {confirmedAddress.street},{' '}
              {confirmedAddress.postalCode} {confirmedAddress.city}
            </Text>
          ) : (
            <Text style={[styles.candidateText, { color: c.onSurfaceVariant }]}>
              Für diese Position wurde keine vollständige Straßenadresse ermittelt. Wähle den Ort in
              diesem Fall über die Ortssuche.
            </Text>
          )}
          {candidate.source === 'gps' ? (
            <Text style={[styles.candidateText, { color: c.onSurfaceVariant }]}>
              Speichere diesen Standort nur, wenn der angezeigte Ort wirklich stimmt. Eine
              Gerät-Ortung kann trotz Freigabe falsch liegen.
            </Text>
          ) : null}
          <View style={styles.candidateActions}>
            <ActionButton
              title="Standort bestätigen und speichern"
              pending={pending}
              disabled={addressPending}
              onPress={confirmCandidate}
            />
            <ActionButton
              title="Verwerfen"
              variant="secondary"
              disabled={pending}
              onPress={dismissCandidate}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Ort oder PLZ für den privaten Vermittlungsstandort"
          editable={!pending || !searchPending}
          onChangeText={setSearchQuery}
          placeholder="Ort manuell: z. B. Leipzig oder 04109"
          placeholderTextColor={c.outline}
          style={[styles.searchInput, { borderColor: c.outlineVariant, color: c.onSurface }]}
          value={searchQuery}
        />
        <ActionButton
          title={searchPending ? 'Suche …' : 'Ort suchen'}
          variant="secondary"
          disabled={searchQuery.trim().length < 3 || pending}
          onPress={search}
        />
      </View>
      {searchResults.map((result) => (
        <Pressable
          key={`${result.latitude}-${result.longitude}`}
          accessibilityRole="button"
          onPress={() => {
            applyCandidate({ ...result, source: 'search' });
            setSearchResults([]);
            setSearchQuery(result.displayName);
          }}
          style={[styles.searchResult, { borderColor: c.outlineVariant }]}
        >
          <Text style={[styles.searchResultText, { color: c.onSurface }]}>
            {result.displayName}
          </Text>
        </Pressable>
      ))}

      {updateLocation.isError ? (
        <Text style={[styles.errorText, { color: c.error }]}>
          Standort konnte nicht gespeichert werden: {updateLocation.error.message}
        </Text>
      ) : null}
      {updateProfile.isError ? (
        <Text style={[styles.errorText, { color: c.error }]}>
          Profiladresse konnte nicht gespeichert werden: {updateProfile.error.message}
        </Text>
      ) : null}
      {error !== null ? <Text style={[styles.errorText, { color: c.error }]}>{error}</Text> : null}
      {message !== null ? (
        <Text style={[styles.savedText, { color: c.success }]}>{message}</Text>
      ) : null}
      <Text style={[styles.description, { color: c.onSurfaceVariant }]}>
        Dein exakter Standort wird nie an andere Nutzer:innen übertragen – die Suche liefert nur auf
        ca. 100 m gerundete Positionen. Ein abweichender Treffpunkt (z. B. ein Stall) wird bei der
        jeweiligen Betreuungsanfrage angegeben.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  description: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 6 },
  candidateBox: { borderRadius: 16, borderWidth: 1, gap: 4, marginTop: 12, padding: 12 },
  candidateTitle: { fontFamily: appFonts.bold, fontSize: 14, lineHeight: 20 },
  candidateText: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18 },
  candidateActions: { gap: 8, marginTop: 6 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  searchInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    fontFamily: appFonts.regular,
    fontSize: 15,
    paddingHorizontal: 14,
  },
  searchResult: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchResultText: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 18 },
  errorText: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 8 },
  savedText: { fontFamily: appFonts.semibold, fontSize: 12, lineHeight: 18, marginTop: 8 },
});
