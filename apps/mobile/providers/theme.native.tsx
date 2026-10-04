import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';
const THEME_KEY = 'pfotennetz.theme-mode';

const ThemeContext = createContext<{
  mode: ThemeMode;
  effectiveMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}>({ mode: 'system', effectiveMode: 'light', setMode: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const effectiveMode = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  useEffect(() => {
    void SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === 'system' || stored === 'light' || stored === 'dark') setModeState(stored);
    });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      effectiveMode,
      setMode: (nextMode: ThemeMode) => {
        setModeState(nextMode);
        void SecureStore.setItemAsync(THEME_KEY, nextMode);
      },
    }),
    [effectiveMode, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
