import { Stack } from 'expo-router/stack';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Anmelden' }} />
      <Stack.Screen name="register" options={{ title: 'Registrieren' }} />
    </Stack>
  );
}
