import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ActionButton, ErrorBox, usePalette } from '../components/ui';
import { parseEmergencyCardToken } from '../lib/emergency-qr';

export default function ScanScreen() {
  const c = usePalette();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    const token = parseEmergencyCardToken(data);
    if (token === null) {
      setError('Das ist kein gültiger PfotenNetz-Notfallkarten-Link.');
      return;
    }
    setScanned(true);
    setError(null);
    router.push({ pathname: '/emergency/[token]', params: { token } });
  };

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: c.surface }]}>
        <Text style={[styles.title, { color: c.onSurface }]}>QR-Code scannen</Text>
        <Text style={[styles.text, { color: c.onSurfaceVariant }]}>
          Kamerazugriff wird benötigt, um eine PfotenNetz-Notfallkarte zu öffnen.
        </Text>
        <ActionButton title="Kamera freigeben" onPress={() => void requestPermission()} />
        <ActionButton title="Zurück" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.heading}>Notfallkarte scannen</Text>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>Richte die Kamera auf den QR-Code der Notfallkarte.</Text>
        {error ? <ErrorBox message={error} /> : null}
        {scanned ? (
          <Pressable style={styles.retry} onPress={() => setScanned(false)}>
            <Text style={styles.retryText}>Erneut scannen</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>Abbrechen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  center: { flex: 1, justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28 },
  text: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, lineHeight: 24 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: 56 },
  heading: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24 },
  scanFrame: { width: 260, height: 260, borderColor: '#fff', borderRadius: 24, borderWidth: 3 },
  hint: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
  },
  retry: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#222', fontFamily: 'PlusJakartaSans_700Bold' },
  back: { padding: 12 },
  backText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
});
