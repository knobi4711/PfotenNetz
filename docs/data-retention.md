# Datenschutz- und Aufbewahrungskonzept (Arbeitsstand)

Dieses Konzept beschreibt die Standard-Aufbewahrung. Eine kürzere Löschung durch
Nutzer:innen oder eine gesetzliche Pflicht hat Vorrang. Automatische Löschjobs
werden erst aktiviert, wenn die Fristen fachlich und rechtlich freigegeben sind.

| Datenkategorie | Zweck | Standardfrist | Löschung / Anonymisierung |
| --- | --- | ---: | --- |
| GPS-Trackingpunkte | Nachweis und Live-Betreuung | 30 Tage nach Abschluss | Punkte löschen; aggregierte Distanz/Dauer in der Buchung behalten |
| Tracking-Sitzungen | Abrechnung und Support | 12 Monate nach Abschluss | Sessiondaten löschen oder anonymisieren |
| Vermisst-Tier-Meldungen und Sichtungen | Tiersuche | 12 Monate nach Fund/Abbruch | Standort und Fotos löschen; anonymisierte Statistik optional |
| Notfallkarten-Links | Öffentliche Notfallhilfe | Ablauf des Links, spätestens 30 Tage | Token widerrufen und Datensatz löschen |
| Pet- und Profilfotos | Profil und Notfallkarte | Bis Löschung/Änderung durch Halter:in | Storage-Objekte mit Datensatz löschen |
| Verifizierungsdokumente | Vertrauensprüfung | 90 Tage nach abgeschlossener Prüfung | Dokument und Signed-URL-Zugriff löschen |
| Push-Geräte | Benachrichtigungszustellung | Bis Abmeldung oder 180 Tage inaktiv | Token und Gerätezeile löschen |

## Technische Leitplanken

- GPS- und Fotozugriff bleibt durch RLS auf die jeweils erforderlichen Rollen begrenzt.
- Öffentliche Notfallkarten enthalten ausschließlich explizit freigegebene Felder.
- Löschjobs müssen idempotent, protokolliert und als Service-Role-Job außerhalb der
  Client-Anwendung ausgeführt werden.
- Vor jeder Aktivierung sind Backup-/Restore-Verhalten, gesetzliche Aufbewahrung,
  Betroffenenrechte und die finale Datenschutzerklärung zu prüfen.

## Offene Freigaben

Die Fristen sind ein technischer Vorschlag und noch keine rechtliche Beratung.
Rechtsprüfung, Löschjob/Monitoring und eine Nutzerfunktion für Export/Löschung
bleiben vor dem Produktionsbetrieb erforderlich.
