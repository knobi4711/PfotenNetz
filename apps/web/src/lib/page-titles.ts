/**
 * R-01 (WCAG 2.4.2): Die meisten Seiten sind Client-Komponenten und können
 * kein `metadata` exportieren. Diese Zuordnung liefert für jeden Pfad einen
 * eindeutigen Seitentitel; `DocumentTitle` setzt daraus `document.title`.
 *
 * Reihenfolge beachten: spezifische Pfade stehen vor ihren Präfixen
 * (z. B. `/missing/radar` vor `/missing/:id`).
 */
const PAGE_TITLES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/$/, 'Startseite'],
  [/^\/home\/?$/, 'Startseite'],
  [/^\/explore\/?$/, 'Helfer:innen in der Nachbarschaft'],
  [/^\/hazard\/radar\/?$/, 'Gefahrenradar'],
  [/^\/hazard\/report\/?$/, 'Gefahr melden'],
  [/^\/hazard\/moderation\/?$/, 'Gefahren-Moderation'],
  [/^\/hazard\/[^/]+\/?$/, 'Gefahrenmeldung'],
  [/^\/tracking\/?$/, 'Betreuung und Tracking'],
  [/^\/community\/moderation\/?$/, 'Community-Moderation'],
  [/^\/community\/?$/, 'Community'],
  [/^\/marketplace\/?$/, 'Tauschbörse'],
  [/^\/pets\/[^/]+\/emergency\/?$/, 'Notfallkarte'],
  [/^\/pets\/?$/, 'Meine Tiere'],
  [/^\/profile\/?$/, 'Profil'],
  [/^\/bookings\/?$/, 'Meine Buchungen'],
  [/^\/booking\/new\/?$/, 'Neue Betreuungsanfrage'],
  [/^\/booking\/[^/]+\/?$/, 'Buchungsdetails'],
  [/^\/chat\/contact\/[^/]+\/?$/, 'Kontaktanfrage'],
  [/^\/chat\/[^/]+\/?$/, 'Chat'],
  [/^\/notifications\/?$/, 'Benachrichtigungen'],
  [/^\/missing\/radar\/?$/, 'Suchmeldungen in der Nähe'],
  [/^\/missing\/[^/]+\/?$/, 'Suchmeldung'],
  [/^\/missing\/?$/, 'Vermisstensuche'],
  [/^\/emergency\/[^/]+\/?$/, 'Notfallkarte'],
  [/^\/account\/delete\/?$/, 'Konto löschen'],
  [/^\/admin\/verifications\/?$/, 'Verifizierungen'],
  [/^\/admin\/reports\/?$/, 'Meldungen'],
  [/^\/reset-password\/?$/, 'Passwort zurücksetzen'],
  [/^\/legal\/privacy\/?$/, 'Datenschutz'],
  [/^\/legal\/terms\/?$/, 'Nutzungsbedingungen'],
  [/^\/kinderschutz\/?$/, 'Kinderschutz'],
];

export const DEFAULT_PAGE_TITLE = 'Pfotennetz';

export function resolvePageTitle(pathname: string): string {
  for (const [pattern, title] of PAGE_TITLES) {
    if (pattern.test(pathname)) return title;
  }
  return DEFAULT_PAGE_TITLE;
}

export function formatDocumentTitle(pathname: string): string {
  const title = resolvePageTitle(pathname);
  return title === DEFAULT_PAGE_TITLE ? title : `${title} · Pfotennetz`;
}
