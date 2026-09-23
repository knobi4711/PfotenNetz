import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '@pfotennetz/design-system';
import { bookingStatusLabels, type BookingStatus } from '../lib/booking';

type Mode = 'light' | 'dark';

export function usePalette() {
  const scheme = useColorScheme();
  const mode: Mode = scheme === 'dark' ? 'dark' : 'light';
  return colors[mode];
}

type Palette = ReturnType<typeof usePalette>;

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
  return (
    <View style={[styles.badge, { backgroundColor: c.surfaceContainerHigh }]}>
      <View style={[styles.dot, { backgroundColor: statusColor(status, c) }]} />
      <Text style={[styles.badgeText, { color: c.onSurface }]}>{bookingStatusLabels[status]}</Text>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant },
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
    variant === 'primary' ? c.primary : variant === 'danger' ? c.error : c.surfaceContainerHigh;
  const textColor =
    variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.onError : c.onSurface;
  const isDisabled = disabled === true || pending === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: pending === true }}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, { backgroundColor, opacity: isDisabled ? 0.6 : 1 }]}
    >
      {pending === true ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 14,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
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
  badgeText: { fontSize: 13, fontWeight: '700' },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  retryWrap: {
    marginTop: 4,
  },
  empty: {
    fontSize: 14,
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
    fontSize: 14,
  },
});
