import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, AppHeader, Card, appFonts, usePalette } from '../../components/ui';

export default function HazardSuccessScreen() {
  const c = usePalette();
  const { hazardNumber } = useLocalSearchParams<{ hazardNumber?: string }>();
  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <AppHeader
        title="Danke für deine Meldung"
        subtitle="Gemeinsam halten wir die Nachbarschaft sicher."
      />
      <Card>
        <Text style={styles.icon}>✓</Text>
        <Text style={[styles.title, { color: c.onSurface }]}>Warnung eingegangen</Text>
        <Text style={[styles.body, { color: c.onSurfaceVariant }]}>
          Deine Meldung {hazardNumber ? `(${hazardNumber}) ` : ''}wird geprüft. Sobald sie aktiv
          ist, werden Menschen im Warnradius informiert.
        </Text>
        <ActionButton
          title="Gefahrenradar öffnen"
          onPress={() => router.replace('/hazard/radar')}
        />
        <ActionButton
          title="Zur Übersicht"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/home')}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  icon: { alignSelf: 'center', fontSize: 62, color: '#2e7d32', marginVertical: 18 },
  title: { fontFamily: appFonts.bold, fontSize: 22, textAlign: 'center', marginBottom: 12 },
  body: {
    fontFamily: appFonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
});
