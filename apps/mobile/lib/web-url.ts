/**
 * Basis-URL der öffentlichen Web-App.
 *
 * `EXPO_PUBLIC_WEB_URL` wird beim Build fest eingesetzt. Fehlt die Variable
 * (z. B. weil sie im EAS-Profil nicht gesetzt ist), fällt die App auf die
 * Produktionsdomain zurück, statt z. B. den Passwort-Reset zu blockieren.
 * Der Wert ist bewusst ein direkter `process.env`-Zugriff, damit der
 * Expo-Bundler ihn ersetzen kann.
 */
export const PRODUCTION_WEB_URL = 'https://pfotennetz.app';

export function webBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (!configured) {
    return PRODUCTION_WEB_URL;
  }
  return configured.replace(/\/+$/, '');
}
