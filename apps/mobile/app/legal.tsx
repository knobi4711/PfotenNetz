import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ActionButton,
  AppHeader,
  Card,
  SectionTitle,
  appFonts,
  usePalette,
} from '../components/ui';

export default function LegalScreen() {
  const c = usePalette();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Rechtliche Hinweise"
          subtitle="Technischer Entwurf – vor Veröffentlichung rechtlich prüfen."
        />
        <Card>
          <SectionTitle>Vermittlung und Haftung</SectionTitle>
          <Text style={[styles.text, { color: c.onSurface }]}>
            PfotenNetz vermittelt Kontakte zwischen Tierhalter:innen und Helfer:innen. Die Plattform
            übernimmt weder Betreuung noch Beaufsichtigung und ist nicht Vertragspartei.
            Nutzer:innen prüfen Eignung, Angaben und eigenen Versicherungsschutz selbst.
          </Text>
        </Card>
        <Card>
          <SectionTitle>Sicheres Kennenlernen</SectionTitle>
          <Text style={[styles.text, { color: c.onSurface }]}>
            Vor der ersten Betreuung ist ein persönliches Probetreffen zu vereinbaren. Private
            Kontaktdaten sollen zunächst im geschützten Chat bleiben.
          </Text>
        </Card>
        <Card>
          <SectionTitle>Vergütung</SectionTitle>
          <Text style={[styles.text, { color: c.onSurface }]}>
            Vorrangig ist ehrenamtliche Gegenseitigkeit über Nachbarschafts-Stunden. Geldzahlungen
            können steuer- oder gewerberechtliche Folgen haben und sind von den Beteiligten selbst
            zu prüfen.
          </Text>
        </Card>
        <ActionButton title="Schließen" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  text: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 22 },
});
