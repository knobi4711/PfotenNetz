import { describe, expect, it } from 'vitest';
import { formatDocumentTitle, resolvePageTitle } from './page-titles';

describe('Seitentitel (R-01)', () => {
  it.each([
    ['/', 'Startseite'],
    ['/home', 'Startseite'],
    ['/explore', 'Helfer:innen in der Nachbarschaft'],
    ['/hazard/radar', 'Gefahrenradar'],
    ['/hazard/report', 'Gefahr melden'],
    ['/hazard/123', 'Gefahrenmeldung'],
    ['/booking/new', 'Neue Betreuungsanfrage'],
    ['/booking/abc', 'Buchungsdetails'],
    ['/chat/contact/xyz', 'Kontaktanfrage'],
    ['/chat/abc', 'Chat'],
    ['/missing/radar', 'Suchmeldungen in der Nähe'],
    ['/missing/abc', 'Suchmeldung'],
    ['/pets/abc/emergency', 'Notfallkarte'],
    ['/pets', 'Meine Tiere'],
    ['/community/moderation', 'Community-Moderation'],
  ])('%s → %s', (pathname, expected) => {
    expect(resolvePageTitle(pathname)).toBe(expected);
  });

  it('hängt den Markennamen an', () => {
    expect(formatDocumentTitle('/explore')).toBe('Helfer:innen in der Nachbarschaft · Pfotennetz');
  });

  it('fällt auf den Markennamen zurück', () => {
    expect(resolvePageTitle('/unbekannt')).toBe('Pfotennetz');
    expect(formatDocumentTitle('/unbekannt')).toBe('Pfotennetz');
  });
});
