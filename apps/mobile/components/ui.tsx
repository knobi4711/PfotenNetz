import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@pfotennetz/design-system';
import { bookingStatusLabels, type BookingStatus } from '../lib/booking';

type Mode = 'light' | 'dark';

export function usePalette() {
  const scheme = useColorScheme();
  const mode: Mode = scheme === 'dark' ? 'dark' : 'light';
  return colors[mode];
}

type Palette = ReturnType<typeof usePalette>;

export const appFonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export function statusColor(status: BookingStatus, palette: Palette): string {
  switch (status) {
    case 'requested':
      return palette.tertiary;
    case 'confirmed':
      return palette.primary;
    case 'in_progress':
      return palette.secondary;
    case 'completed':
      return palette.success;
    case 'cancelled':
      return palette.outline;
    case 'disputed':
      return palette.error;
  }
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const c = usePalette();
  const backgroundColor =
    status === 'in_progress' || status === 'completed'
      ? c.successContainer
      : status === 'requested'
        ? c.tertiaryFixed
        : status === 'disputed'
          ? c.errorContainer
          : status === 'confirmed'
            ? c.secondaryFixed
            : c.surfaceContainerHigh;
  const textColor =
    status === 'in_progress' || status === 'completed'
      ? c.onSuccessContainer
      : status === 'requested'
        ? c.onTertiaryFixedVariant
        : status === 'disputed'
          ? c.onErrorContainer
          : status === 'confirmed'
            ? c.onSecondaryFixedVariant
            : c.onSurfaceVariant;
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: statusColor(status, c) }]} />
      <Text style={[styles.badgeText, { color: textColor }]}>{bookingStatusLabels[status]}</Text>
    </View>
  );
}

export function Card({ children, accentColor }: { children: ReactNode; accentColor?: string }) {
  const c = usePalette();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surfaceContainerLowest,
          borderColor: `${c.outline}22`,
          shadowColor: c.surfaceTint,
          borderLeftColor: accentColor ?? `${c.outline}22`,
          borderLeftWidth: accentColor === undefined ? 1 : 4,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[styles.sectionTitle, { color: c.onSurface }]}>{children}</Text>;
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  const c = usePalette();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.onSurface }]}>{value}</Text>
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  disabled,
  pending,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const c = usePalette();
  const backgroundColor =
    variant === 'primary' ? c.primary : variant === 'danger' ? c.error : 'transparent';
  const textColor =
    variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.onError : c.onSurface;
  const isDisabled = disabled === true || pending === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: pending === true }}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        variant === 'secondary' ? styles.buttonSecondary : null,
        {
          backgroundColor,
          borderColor: variant === 'secondary' ? c.secondary : backgroundColor,
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
    >
      {pending === true ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[styles.buttonText, { color: variant === 'secondary' ? c.secondary : textColor }]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = usePalette();
  return (
    <View style={[styles.errorBox, { backgroundColor: c.errorContainer }]}>
      <Text style={[styles.errorText, { color: c.onErrorContainer }]}>{message}</Text>
      {onRetry !== undefined ? (
        <View style={styles.retryWrap}>
          <ActionButton title="Erneut versuchen" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[styles.empty, { color: c.onSurfaceVariant }]}>{children}</Text>;
}

export function LoadingView({ label }: { label: string }) {
  const c = usePalette();
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={[styles.loadingLabel, { color: c.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

// Stitch "PfotenNetz App": App-Kopfzeile mit Titel, Untertitel und Avatar.
export function AppHeader({
  title,
  subtitle,
  avatarLabel,
  onNotifications,
  hasNotifications,
}: {
  title: string;
  subtitle?: string;
  avatarLabel?: string;
  onNotifications?: () => void;
  hasNotifications?: boolean;
}) {
  const c = usePalette();
  return (
    <View style={styles.appHeaderWrap}>
      <View style={styles.brandRow}>
        <View style={styles.brandLockup}>
          <View style={[styles.brandMark, { backgroundColor: c.primaryFixed }]}>
            <MaterialCommunityIcons name="paw" size={15} color={c.primary} />
          </View>
          <Text style={[styles.brandName, { color: c.onSurface }]}>PfotenNetz</Text>
        </View>
        <View style={styles.appHeaderSide}>
          {onNotifications !== undefined ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Benachrichtigungen öffnen"
              onPress={onNotifications}
              style={[styles.bellButton, { backgroundColor: c.surfaceContainerLow }]}
            >
              <MaterialCommunityIcons name="bell-outline" size={21} color={c.onSurface} />
              {hasNotifications === true ? (
                <View style={[styles.notificationDot, { backgroundColor: c.error }]} />
              ) : null}
            </Pressable>
          ) : null}
          <View
            style={[
              styles.avatar,
              { backgroundColor: c.secondaryContainer, borderColor: c.surfaceContainerLowest },
            ]}
          >
            <Text style={[styles.avatarText, { color: c.onSecondaryContainer }]}>
              {avatarLabel ?? '🐾'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.appHeaderMain}>
        <Text style={[styles.appHeaderTitle, { color: c.onSurface }]}>{title}</Text>
        {subtitle !== undefined ? (
          <Text style={[styles.appHeaderSubtitle, { color: c.onSurfaceVariant }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

// Stitch "PfotenNetz App": Filter-Chip für horizontale Auswahlreihen.
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
  const c = usePalette();
  const isSelected = selected === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? c.primary : c.surfaceContainerLowest,
          borderColor: isSelected ? c.primary : c.outlineVariant,
        },
      ]}
    >
      {icon !== undefined ? (
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={isSelected ? c.onPrimary : c.onSurfaceVariant}
        />
      ) : null}
      <Text style={[styles.chipText, { color: isSelected ? c.onPrimary : c.onSurface }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// Stitch "PfotenNetz App": Horizontale Chip-Reihe.
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      <View style={styles.chipRow}>{children}</View>
    </ScrollView>
  );
}

// Stitch "PfotenNetz App": Kritische Hinweis-Karte (z. B. strittige Buchung).
export function AlertBanner({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const c = usePalette();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.alertBanner, { backgroundColor: c.errorContainer, borderColor: c.error }]}
    >
      <MaterialCommunityIcons name="alert-circle-outline" size={24} color={c.error} />
      <View style={styles.alertMain}>
        <Text style={[styles.alertTitle, { color: c.onErrorContainer }]}>{title}</Text>
        <Text style={[styles.alertMessage, { color: c.onErrorContainer }]}>{message}</Text>
        {actionLabel !== undefined && onAction !== undefined ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            style={styles.alertAction}
          >
            <Text style={[styles.alertActionText, { color: c.error }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: appFonts.bold,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  rowLabel: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    flexShrink: 1,
  },
  rowValue: {
    fontFamily: appFonts.semibold,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 1,
  },
  button: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  buttonText: {
    fontFamily: appFonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  buttonSecondary: { borderWidth: 1.5 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontFamily: appFonts.bold, fontSize: 11, lineHeight: 14 },
  errorBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: appFonts.semibold,
    fontSize: 13,
    lineHeight: 20,
  },
  retryWrap: {
    marginTop: 4,
  },
  empty: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingLabel: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  appHeaderWrap: { marginBottom: 24 },
  brandRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: appFonts.extrabold, fontSize: 15, letterSpacing: -0.2 },
  appHeaderMain: { flexShrink: 1, flex: 1 },
  appHeaderTitle: {
    fontFamily: appFonts.extrabold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  appHeaderSubtitle: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  appHeaderSide: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: appFonts.extrabold, fontSize: 16 },
  notificationDot: {
    position: 'absolute',
    right: 9,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 40,
    paddingVertical: 9,
  },
  chipText: { fontFamily: appFonts.semibold, fontSize: 13, lineHeight: 18 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  alertMain: { flexShrink: 1, flex: 1, gap: 2 },
  alertTitle: { fontFamily: appFonts.extrabold, fontSize: 16, lineHeight: 22 },
  alertMessage: { fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20 },
  alertAction: { marginTop: 8, alignSelf: 'flex-start' },
  alertActionText: { fontFamily: appFonts.bold, fontSize: 13, lineHeight: 18 },
});
