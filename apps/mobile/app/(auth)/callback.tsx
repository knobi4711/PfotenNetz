import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingView, usePalette } from '../../components/ui';

export default function AuthCallbackScreen() {
  const c = usePalette();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <LoadingView label="E-Mail-Bestätigung wird verarbeitet …" />
    </SafeAreaView>
  );
}
