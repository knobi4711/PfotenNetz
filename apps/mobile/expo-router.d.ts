/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference types="expo-router" />
import 'expo-router';

declare module 'expo-router' {
  interface ExpoRouterRouteMap {
    '/(tabs)/home': undefined;
    '/(tabs)/explore': undefined;
    '/(tabs)/tracking': undefined;
    '/(tabs)/profile': undefined;
    '/(auth)/login': undefined;
    '/booking/[id]': { id: string };
  }

  // The ambient declaration above shadows the package root types in this
  // project setup (verified: pure augmentation leaves 'router' and
  // 'useLocalSearchParams' unresolvable, TS2305). The members below mirror
  // the installed expo-router v4 API (see build/exports.d.ts: router from
  // './imperative-api', useLocalSearchParams from './hooks').
  // Runtime behavior is unchanged (Metro ignores .d.ts files).
  function useLocalSearchParams<TParams = Record<string, string>>(): TParams;
  function useSegments(): string[];
  const router: {
    push: (href: string | { pathname: string; params?: Record<string, string> }) => void;
    replace: (href: string | { pathname: string; params?: Record<string, string> }) => void;
    back: () => void;
    canGoBack: () => boolean;
  };
}
