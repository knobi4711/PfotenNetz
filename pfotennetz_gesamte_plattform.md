# PfotenNetz — Gesamte Plattform-Architektur & Screen-Spezifikation

**Projekt:** PfotenNetz — Mobile-First & Desktop Nachbarschafts-Plattform für Haustierbetreuung, P2P-Solidarität & hyperlokale Gefahrenwarnung  
**Version:** 3.2.0 (Standabgleich Mobile/Web, 24.09.2026)
**Design-System:** Warm Community Pet Care (`#e26d46` Terracotta, `#2e7d32` Salbeigrün/Waldgrün, `#fff8f5` Warm Linen)  
**Status:** Mobile-Betreuungsplattform und zentrale Web-Flows implementiert; Notfall-, Integrations- und Produktionsfunktionen teilweise offen

---

## 0. Aktueller Implementierungsstand (24.09.2026)

Diese Spezifikation beschreibt weiterhin das vollständige Zielbild. Der tatsächlich implementierte Stand ist:

### Umgesetzt – Mobile-App

- Authentifizierung, Registrierung, Session-Handling und Android-Fingerabdruck-Anmeldung
- Dashboard, Haustierverwaltung, Tierbilder, Geburtsdatum/Alter sowie Aktiv-/Pausiert-/Verstorben-Status
- Dashboard ohne den separaten Abschnitt „Meine Haustiere“; Haustiere bleiben über den eigenen Tab verwaltbar
- Digitale Tier-Notfallkarte mit Chipnummer, Medikamenten, Allergien, Tierarzt- und Versicherungsdaten, inklusive Teilen-Funktion
- Helfer:innen-Suche mit Standortfreigabe, Radius und schematischer Karte
- OpenStreetMap/Nominatim-Ortssuche im Web-Gefahrenmelder mit Übernahme der gefundenen Koordinaten
- OpenStreetMap-/Leaflet-Karten für Helfer:innen-Suche, Gefahrenradar und Tracking-Flows
- Buchungsworkflow inklusive Statuswechseln, Zeitbank und Benachrichtigungen
- Buchungs-Chat mit Nachrichtenliste und Realtime-Grundlage
- Gefahrenmeldung, Gefahrenradar, Foto-Upload, Zeit-/Dringlichkeitsfilter, Realtime-Aktualisierung und Moderationsansicht
- Admin-Zugangspunkt „Administration“ im Profil/Header; sichere Gefahrenmoderation für Admins
- Helfer:innen-Verfügbarkeiten mit Mehrfachauswahl beliebiger Wochentage und Zeit-Dropdowns in 30-Minuten-Schritten
- Community-Events mit Teilnahme vormerken/zurücknehmen
- Vermisste-Tiere-Meldung, eigene Suchmeldungen, Status „gefunden“ und Vermissten-Radar
- Hintergrund-/Foreground-Tracking-Service, serverseitige Positions-/Telemetrie-Synchronisierung und Web-Live-Tracking

### Umgesetzt – Web-App

- Authentifizierte Desktop-Dashboard-Shell
- `/explore`: Helfer:innen-Karte und Radius-Suche
- `/hazard/radar`: Desktop-Gefahrenradar mit Standort, Pins und Filtern
- `/hazard/report` und `/hazard/[id]`: Gefahrenmeldung und Details
- `/bookings`: Buchungsübersicht
- `/profile`: Profil und Zeitbank-Verlauf
- `/pets`: Tierprofile
- `/tracking`: Betreuung-/Tracking-Übersicht
- `/community`: kommende Community-Events
- `/hazard/moderation`: Admin-Moderation aktiver Gefahrenmeldungen
- Root-`.env`-Laden für den Web-Build im Monorepo

### Qualitätsstand

- Repository-Typecheck: erfolgreich
- Mobile-Lint: erfolgreich
- Web-Typecheck und Web-Lint: erfolgreich
- Mobile-Typecheck und Mobile-Lint: erfolgreich
- Supabase-Tests: 81 erfolgreich
- Mobile-Tests: 54 erfolgreich
- Web-E2E: 10/10 erfolgreich
- Web-Build: erfolgreich
- Expo-Android-Bundle: erfolgreich erzeugt
- Remote-Migrationen bis `049_fix_hazard_sighting_geography_assignment.sql` angewendet

### Noch nicht vollständig umgesetzt

- Vollständige Geocoding- und Routenberechnung sowie flächendeckende Straßenkartenfunktionen
- Native Hintergrund-/Geofence- und Broadcast-Tests auf echten Geräten
- Offline-Synchronisierung der öffentlichen Notfallkarte
- Tasso-Anbindung und automatische Vermisst-Tier-Synchronisierung
- Rich-Push-Lockscreen mit Ausweichroute und Entwarnungsaktion
- Foto-/Audio-Upload, Voice-Notes, Anruf-/Video-Funktionen und Ende-zu-Ende-Verschlüsselung im Chat
- SmartLock, Haftpflicht-/Schutzgarantie- und Tierarzt-/Polizei-Integrationen
- Vollständige Community-Moderation und Event-Erstellung
- Native Passkeys bleiben ein PoC und benötigen einen Development Build

---

## 1. Executive Summary & Plattform-Konzept

**PfotenNetz** verbindet Tierhalter, ehrenamtliche Nachbarschaftshelfer und tiermedizinische Notdienste in einem dezentralen, vertrauensbasierten Netzwerk. 

### Kern-Säulen der Plattform:
1. **Hyperlokale Sicherheit & Gefahrenwarnung (Broadcast < 60s):** Echtzeit-Meldung von Gefahren (z. B. Giftköder, Glasscherben, aggressive Tiere) mit Geofencing, Fotovalidierung und Push-Alarmierung im 1,5 km Nachbarschafts-Radius.
2. **Ehrenamtliches Zeitbank-System (Solidaritäts-Zyklus):** Tausch von Betreuungszeiten („1 Nachbarschaftsstunde pro Walk“) ohne kommerziellen Druck, ergänzt durch Treuhand-Schlüsselboxen und eine 2.500 € Nachbarschafts-Schutzgarantie.
3. **Live-Tracking & P2P-Transparenz:** GPS-basiertes Gassi-Tracking mit Telemetrie (Distanz, Pausen, Geschäfte, Trinkzeiten) und integriertem 1:1 Foto-Chat.
4. **Digitale Notfall-Infrastruktur:** 24/7 Notfallakte mit Offline-Sync, Chip-ID, Tierarzt-Direktwahl und behördlicher Tasso-Kopplung bei vermissten Tieren.
5. **Barrierefreiheit (WCAG 2.1 AA):** Strikte Kontrastverhältnisse (> 5.2:1), Tastaturbedienbarkeit mit Fokus-Ringen, ARIA-Live-Regionen für Tracking & Chat und min. 44x44 px Touch-Targets.

---

## 2. Globale Navigations- & Shell-Architektur

### A. Mobile App (Navigation Shells)
* **Mobile Tab Shell (Hauptnavigation):**
  * `Nachbarschafts-Feed` (Home / Dashboard)
  * `Entdecken` (Nachbarschaftskarte, Helfer- & Tiersuche)
  * `Anfragen` (Laufende Betreuungen, GPS-Tracking & Historie)
  * `Profil` (Zeitbank-Konto, Einstellungen, Radius-Filter & Notfallakten)
* **Mobile Stack Shell (Modal / Sub-Flows):**
  * Schlanke Header-Leiste mit Zurück-/Schließen-Aktion (`<button aria-label="Zurück">`) ohne störende Bottom-Tab-Bar für maximale Fokus-Fläche (z. B. im 3-Schritt-Gefahrenmelder oder 1:1 Chat).
* **Mobile Blank Shell:**
  * Vollbild-Darstellung für native System-Events (Lockscreen Rich Push Notification).

### B. Desktop Web-Portal (Widescreen Shell — 1440px)
* **Top Navigation Bar:**
  * Logo & Brandmark (`PfotenNetz`)
  * Hauptreiter: `Dashboard`, `Nachbarschaftskarte & Helfer`, `Gefahren- & Notfall-Leitstelle`, `Betreuung & Live-Tracking`, `Community & Treff`
  * Standort-Badge mit Radius (`Berlin-Prenzlauer Berg / Kollwitz-Nachbarschaft 1,5 km`)
  * Zeitbank-Guthaben Pill (`14,5 Std. Zeitbank`)
  * Profil-Avatar & Schnelleinstieg
* **Globaler Footer:**
  * Statusanzeige: `Nachbarschafts-Netzwerk aktiv (18 Notfall-Helfer bereit)`
  * Vertrauenssiegel: `Verifiziertes Nachbarschafts-Netzwerk mit Nachbarschafts-Garantie & Tierhaftpflichtschutz`
  * Rechtliches: `Impressum & Datenschutz`, `Nachbarschafts-Statuten`, `© 2024 PfotenNetz e. V.`

---

## 3. Detaillierte Seitenbeschreibung aller Screens

### Flow 00: System-Architektur & Leitstand

#### Screen 00: PfotenNetz — Visuelle User-Flow- & System-Architektur (Desktop)
* **Route:** `/architecture/overview`
* **Zielgruppe:** Produktmanagement, Entwickler, Rettungskräfte & Auditoren.
* **Beschreibung:** Ganzheitliche System- und Flow-Matrix aller nativen Mobile- und Web-Screens. Enthält SLA-Metriken (Broadcast < 60s, Key-Exchange via AES-256), interaktive Journey-Ketten, Trigger-Schleifen von Bürgerfund bis Entwarnung sowie die zentrale Design-Token-Matrix.

---

### Flow 01: Gefahren-, Melde- & Notfall-Kette

#### Screen 01: Gefahr melden: Schritt 1 (Art & Ort) (Mobile)
* **Route:** `/hazard/report/step-1`
* **Shell:** Mobile Stack
* **Beschreibung:** Erster Schritt des strukturierten Notfall-Meldeworkflows.
* **Komponenten & Features:**
  * Semantische Typ-Auswahl im `<fieldset>`: Giftköderverdacht, Glasscherben/Müll, Ausreißer/Freiläufer, aggressive Artgenossen, Wespen-/Eichenprozessionsspinner.
  * Hyperlokale GPS-Standortortung mit interaktivem Karten-Picker und Adress-Suchfeld (`Mauerpark Hauptweg`).
  * Barrierefreie Schrittanzeige (`Schritt 1 von 3: Art & Ort`).

#### Screen 02: Gefahr melden: Schritt 2 (Details & Foto) (Mobile)
* **Route:** `/hazard/report/step-2`
* **Shell:** Mobile Stack
* **Beschreibung:** Validierungs- und Dokumentations-Screen zur Vermeidung von Falschmeldungen.
* **Komponenten & Features:**
  * Kamera-Trigger & Drag-and-Drop Foto-Upload mit visueller Bildvorschau.
  * Automatische EXIF-Geodaten-Prüfung zur Verifikation der Vor-Ort-Anwesenheit.
  * Dringlichkeits-Stufen (Niedrig, Mittel, Akute Lebensgefahr).
  * Freitextfeld für Verhaltens- und Funddetails mit Screenreader-Label.

#### Screen 03: Gefahr melden: Schritt 3 (Vorschau & Veröffentlichen) (Mobile)
* **Route:** `/hazard/report/step-3`
* **Shell:** Mobile Stack
* **Beschreibung:** Letzte Freigabe- und Radius-Konfiguration vor dem P2P-Broadcast.
* **Komponenten & Features:**
  * Interaktive Radius-Simulation (500m, 1,0 km, 1,5 km Pufferzone).
  * Prognose-Badge: *„Erreicht ca. 248 Tierhalter in Echtzeit“*.
  * Verbindliche Bestätigungs-Checkbox für Richtigkeit nach Nachbarschafts-Statuten.
  * Primärer Notfall-CTA: `Gefahr jetzt veröffentlichen & Nachbarschaft warnen (Broadcast auslösen)`.

#### Screen 04: Gefahr gemeldet: Nachbarschafts-Dankeschön & Status (Mobile)
* **Route:** `/hazard/report/success`
* **Shell:** Mobile Stack
* **Beschreibung:** Bestätigungs- und Feedback-Screen nach erfolgreicher Meldung.
* **Komponenten & Features:**
  * Erfolgs-Hero mit animiertem Checkmark und Dank an den Melder.
  * Impact-KPIs: `248 Halter gewarnt`, `+15 Nachbarschafts-Karma gutgeschrieben`.
  * Status-Pill: *„An Prüf-Paten und Tierärztliche Notdienste weitergeleitet“*.
  * Schnell-Aktionen: *„Auf Nachbarschafts-Gefahrenradar ansehen“* & *„Warnung via Messenger/QR teilen“*.

#### Screen 05: Sperrbildschirm: Nachbarschafts-Alarm Push-Notification (Mobile)
* **Route:** `/system/push-notification`
* **Shell:** Mobile Blank (OS-Lockscreen)
* **Beschreibung:** Systemweite Notfall-Push-Benachrichtigung mit höchster Prioritätsstufe.
* **Komponenten & Features:**
  * Rich-Push-Card mit Terracotta-Signalfarbe und Warn-Symbol.
  * Schlagzeile: *„NACHBARSCHAFTS-WARNUNG • Vor 2 Min.“*
  * Teaser-Text: *„Giftköderverdacht am Mauerpark (Spielplatz-Nähe). Bitte Ausweichroute nutzen!“*
  * Direkte Schnellaktion-Buttons: `Ausweichroute öffnen` und `Entwarnung melden`.

#### Screen 06: Nachbarschafts-Alarm Detail: Giftköderverdacht Mauerpark (Mobile)
* **Route:** `/hazard/detail/mauerpark-alert`
* **Shell:** Mobile Stack
* **Beschreibung:** Vollständige Krisen- und Detailansicht nach Klick auf die Warnmeldung.
* **Komponenten & Features:**
  * Hochauflösende Gefahrenkarte mit 150m roter Pufferzone und alternativer grüner Ausweichroute.
  * Peer-Verifikations-Leiste: 14 Stimmen (85% Entwarnungs-Konsens vs. 2 Restfunde).
  * Interaktives Community-Voting: Buttons `Bereich gesäubert` vs. `Gefahr besteht weiterhin`.
  * Direktwahl-Buttons: Tierarzt-Notruf Berlin (24/7) und Polizei-Abschnitt 15.

#### Screen 17: Nachbarschafts-Gefahrenradar (Mobile)
* **Route:** `/radar/overview`
* **Shell:** Mobile Tab / Stack
* **Beschreibung:** Interaktive Gesamtkarten-Übersicht aller gemeldeten Vorkommnisse.
* **Komponenten & Features:**
  * Vollflächige Vektorkarte mit differenzierten Pins (Rot: Akut, Gelb: In Prüfung, Grün: Entwarnt).
  * Filter-Chips nach Vorkommnis-Art und Zeitfenster (letzte 2h, 24h, 7 Tage).
  * Schwebende Schnellmelde-Taste für Spaziergänger vor Ort.

---

### Flow 02: Haustierbetreuung, Live-Tracking & Solidaritäts-Zyklus

#### Screen 07: Übersicht & Haustier-Dashboard (Mobile)
* **Route:** `/home/dashboard`
* **Shell:** Mobile Tab (Tab „Nachbarschafts-Feed“ aktiv)
* **Beschreibung:** Tägliche Schaltzentrale für den Tierhalter.
* **Komponenten & Features:**
  * Begrüßungs-Header mit Ort (`Kollwitz-Nachbarschaft`) und aktiven Online-Paten (24 Pfoten online).
  * Tier-Karte (Golden Retriever „Balu“) mit aktuellem Status (*„Entspannt zu Hause nach Mittagsrunde“*) und Medikamenten-Timer (Apoquel 16mg in 4h).
  * Schnellzugriff auf den digitalen Nachbarschafts-Notfallausweis mit QR-Code.
  * Nachbarschafts-Feed mit Posts von abgeschlossenen Spaziergängen, Nachbarschafts-Hilfegesuchen und Rudelrunden.
  * Pfotenschutz-Wetter-Widget: Anzeige der Asphalt-Temperatur (`21°C — Pfoten sicher`).

#### Screen 08: Karten-Feed & Tiersuche (Mobile)
* **Route:** `/explore/map-feed`
* **Shell:** Mobile Tab (Tab „Entdecken“ aktiv)
* **Beschreibung:** Geo-basierte Suche nach Helfern, Spielpartnern und Notapotheken.
* **Komponenten & Features:**
  * Kartenausschnitt mit Standort-Radius (1,0 km) und Helfer-Pins.
  * Filter-Pills: `Hundeerfahren`, `Sachkundenachweis`, `Heute verfügbar`, `Schlüsselübergabe SmartLock`.
  * Horizontales Karussell mit geprüften Helfer-Karten inkl. Trust-Badges und Bewertungssternen.

#### Screen 09: Helfer-Detail & Buchung: Jonas K. (Mobile)
* **Route:** `/sitter/jonas-k`
* **Shell:** Mobile Tab / Stack
* **Beschreibung:** Vertrauensprofil und verbindlicher Buchungs-Handschlag.
* **Komponenten & Features:**
  * Verifizierter Helfer-Header: 4.9 Sterne, 42 Walks, Sachkundenachweis & Tiernothelfer-Zertifikat.
  * Buchungsdetails: Abrechnung über das faire Zeitbank-System (1 Zeitbankstunde für 45–60 Min. Walk).
  * SmartLock-Treuhand-Depot: Schlüsselabholung kontaktlos und versichert freigegeben.
  * Buchungs-CTA: `Betreuung verbindlich anfragen (1 Std.)` abgesichert durch 2.500 € Nachbarschafts-Schutzgarantie.

#### Screen 10: Anfragen & Status-Tracking (Gassi-GPS & Chat) (Mobile)
* **Route:** `/tracking/live-walk`
* **Shell:** Mobile Tab (Tab „Anfragen“ aktiv)
* **Beschreibung:** Echtzeit-Telemetrie und Statusüberwachung während eines aktiven Spaziergangs.
* **Komponenten & Features:**
  * Live-GPS-Karte mit gelaufener Route im Mauerpark und Positions-Pin von Helfer & Hund.
  * Telemetrie-Bar: Gelaufene Distanz (`1,8 km`), Geschäftszähler (`2x Häufchen`), Tempo (`Schnüffeln`).
  * Dynamische Fortschrittsleiste der gebuchten Zeit (`22 / 45 Min`).
  * Barrierefreie ARIA-Live-Region für automatische Sprachausgabe neuer Meilensteine.
  * Notfall-Split-Buttons: `Live-Standort teilen` & `Tiernotruf kontaktieren`.

#### Screen 11: Interner Chat: Sarah & Jonas (Balu) (Mobile)
* **Route:** `/chat/booking-8429`
* **Shell:** Mobile Stack
* **Beschreibung:** Ende-zu-Ende verschlüsselte 1:1 Kommunikation zwischen Besitzer und Betreuer.
* **Komponenten & Features:**
  * Chat-Header mit Anruf- und Video-Option sowie Walk-Kurzstatus.
  * Strukturierter Nachrichtenverlauf mit Zeitstempeln und Foto-Vorschau von unterwegs.
  * Quick-Reply-Vorschläge (*„Danke Jonas! ❤️“*, *„Gibt es Probleme?“*, *„Wasser gegeben?“*).
  * Barrierefreie Eingabezeile mit Bild-Upload, Audio-Voice-Note und Senden-Taste (> 44 px).

---

### Flow 03: Community, Vertrauen & Schwarm-Sicherheit

#### Screen 12: Notfall: Kater Felix vermisst (Mobile)
* **Route:** `/missing/felix-sos`
* **Shell:** Mobile Stack
* **Beschreibung:** Hyperlokales Such-Radar für entlaufene Haustiere.
* **Komponenten & Features:**
  * SOS-Signalfarbe mit Steckbrief-Foto, Rasse, Chip-Nummer und Merkmalen.
  * 3 km Nachbarschafts-Suchpolygon mit Markierung des Entlauf-Ortes und bestätigten Sichtungen.
  * Sichtungs-Melde-CTA mit Direkt-Upload für Nachbarn vor Ort.
  * Automatische Synchronisation mit der Tasso-Zentraldatenbank.

#### Screen 13: Tier-Notfallakte: Balu (Mobile)
* **Route:** `/pet/balu/emergency-card`
* **Shell:** Mobile Stack
* **Beschreibung:** Digitale Patienten- und Notfallkarte für Fremdbetreuer und Kliniken.
* **Komponenten & Features:**
  * QR-Code für den sekundenschnellen Scan durch Tierrettung oder Tierarzt ohne Login.
  * Kritische Gesundheitsdaten: Vorerkrankungen, Medikamente (Dosierung), Futterallergien.
  * Tierarzt-Direktkontakt mit Adress-Navigation und hinterlegter Versicherungsnummer.
  * Offline-Verfügbarkeit auf dem Gerät für den Funkloch-Einsatz.

#### Screen 14: Nachbarschafts-Treff & Playdates (Mobile)
* **Route:** `/community/playdates-and-meet`
* **Shell:** Mobile Stack
* **Beschreibung:** Soziale Vernetzung, Gruppenaktivitäten und Nachbarschaftshilfe.
* **Komponenten & Features:**
  * Event-Kalender: Regelmäßige Termine wie die *„Sonntags-Rudelrunde im Mauerpark“*.
  * Teilnehmer-Avatare mit Angabe der verträglichen Hunderassen.
  * Nachbarschafts-Tauschbörse für Zubehör (z. B. Transportboxen, Hundemäntel, Futterspenden).
  * Forum für saisonale Nachbarschafts-Themen (z. B. Schattenrouten bei Sommerhitze).

#### Screen 15: Nachbarschafts-Sicherheit & Verifizierung (Mobile)
* **Route:** `/trust/verification`
* **Shell:** Mobile Stack
* **Beschreibung:** 4-Stufen Vertrauens- und Sicherheitsnachweis für alle Mitglieder.
* **Komponenten & Features:**
  * Status-Dashboard: Aktuell erreichtes Level (z. B. *„Stufe 4 von 4: Gold Trust Level“*).
  * Verifikations-Kriterien: Personalausweis (eID), Tierhalterhaftpflicht-Nachweis, polizeiliches Führungszeugnis.
  * Peer-Bürgschaften: Bestätigung der Zuverlässigkeit durch mindestens 3 bestehende Nachbarn.

#### Screen 16: Profil & Nachbarschafts-Einstellungen (Mobile)
* **Route:** `/user/settings`
* **Shell:** Mobile Tab (Tab „Profil“ aktiv)
* **Beschreibung:** Verwaltung des Benutzerkontos, Zeitbank-Salden und Schutzeinstellungen.
* **Komponenten & Features:**
  * Zeitbank-Kontoübersicht mit Historie der geleisteten und empfangenen Stunden.
  * Schieberegler für den persönlichen Nachbarschafts-Radius (500m bis 5 km).
  * Push-Notification-Präferenzen (Akute Gefahren, Gassi-Anfragen, Community-Events).
  * Theme-Umschaltung: Hell, Dunkel (Hoher Kontrast) und System-Automatik.

---

### Flow 04: Desktop Web-Portale (1440px Widescreen)

#### Screen 18: PfotenNetz Web — Zentrales Nachbarschafts-Dashboard (Desktop)
* **Route:** `/web/dashboard`
* **Shell:** Widescreen Portal Shell
* **Beschreibung:** Großformatiges All-in-One Dashboard für Heimrechner und Tablets.
* **Komponenten & Features:**
  * **Linke Spalte:** Tierprofile („Meine Schutzlinge“), Medikamenten-Timer, digitaler Notfallausweis-Schnellaufruf und Pfotenschutz-Wetter.
  * **Mittlere Spalte:** Live-Feed mit Fotoberichten von Spaziergängen, Nachbarschafts-Gesuchen und Community-Events.
  * **Rechte Spalte:** Zeitbank-Konto (`14,5 Std.`), Trust-Level-Audit, 24/7 Notfallkontakt zur Tierklinik und SmartLock-Schlüsselbox-Verwaltung.

#### Screen 19: PfotenNetz Web — Nachbarschaftskarte & Helfer-Finder (Desktop)
* **Route:** `/web/map-explore`
* **Shell:** Widescreen Portal Shell
* **Beschreibung:** Großflächige Desktop-Kartenanwendung zur Helfer-Recherche und Tourenplanung.
* **Komponenten & Features:**
  * **Große interaktive Karte:** Filterbare Marker für Helfer, Gefahrenstellen, Playdates und Notfall-Apotheken.
  * **Radius-Stepper:** 500m, 1,0 km, 1,5 km, 3,0 km mit sofortiger Marker-Aktualisierung.
  * **Rechtes Buchungs-Panel:** Detaillierte Helfer-Biografie von Jonas K. mit Sachkundenachweis, Terminwahl und verbindlichem Buchungsabschluss.

#### Screen 20: PfotenNetz Web — Gefahren- & Notfall-Leitstelle (Desktop)
* **Route:** `/web/emergency-hub`
* **Shell:** Widescreen Portal Shell
* **Beschreibung:** Professionelle Leitstellen- und Meldeansicht für Nachbarschafts-Paten und Tierhalter.
* **Komponenten & Features:**
  * **KPI-Header:** Sicherheitsstatus (*„Normal & Überwacht“*), Broadcast-Reichweite (*„< 60s Push-Garantie“*), 48 aktive Wächter online.
  * **Links — Melde-Panel:** Semantisches Erfassungsformular mit Fundort-Geocoding, EXIF-Beweisfoto-Upload und Auslöse-CTA.
  * **Rechts — Live-Audit & Notruf:** Laufende Entwarnungs-Prüfung im Mauerpark mit Community-Konsens (85%), alternativer Ausweichroute und 24/7 Direktwahlnummern.

#### Screen 21: PfotenNetz Web — Betreuungs-Manager, Live-Tracking & Chat (Desktop)
* **Route:** `/web/tracking-chat`
* **Shell:** Widescreen Portal Shell
* **Beschreibung:** Duale Schaltzentrale für paralleles GPS-Echtzeit-Tracking und Betreuer-Chat.
* **Komponenten & Features:**
  * **Links:** Vollwertiges Karten-Tracking mit Live-Pfad, Meilensteinen, Telemetrie und Geofence-Überwachung.
  * **Rechts:** Integrierter 1:1 Kommunikations-Stream mit Medien-Galerie, Schnellantworten und Zeitbank-Buchungsfreigabe.

---

## 4. MCP-Manifest & Metadaten-Mapping

Jeder HTML-Screen ist im DOM für externe LLM-Agenten, Screenreader und MCP-Clients mit einheitlichen Daten-Attributen annotiert:

```html
<div class="screen-container"
     data-screen-id="SCREEN_XX"
     data-flow-id="flow-0X"
     data-flow-name="Name des Flows"
     data-label="Menschlich lesbarer Screen-Name"
     data-step="X/Y (falls Flow-Schritt)"
     data-role="Funktionale Aufgabe des Screens"
     data-device-type="mobile | desktop">
  <!-- Screen Content -->
</div>
```

---

## 5. Konformitäts- & Barrierefreiheits-Zertifizierung

| WCAG 2.1 Kriterium | Stufe | Implementierung in PfotenNetz | Status |
| :--- | :--- | :--- | :--- |
| **1.4.3 Kontrast (Minimum)** | AA | Design-Tokens und zentrale UI-Komponenten berücksichtigen die definierten Kontrastwerte. Eine vollständige externe Prüfung steht noch aus. | Teilweise verifiziert |
| **1.1.1 Nicht-Text-Inhalt** | A | Bilder und Tierbilder erhalten im Web Alt-Texte; eine vollständige Mobile-/Web-Inventur steht noch aus. | Teilweise verifiziert |
| **2.1.1 Tastaturbedienung** | A | Web-Buttons sind grundsätzlich tastaturbedienbar; eine vollständige Tastatur-Journey für alle Desktop-Flows fehlt. | Teilweise verifiziert |
| **2.4.7 Fokus sichtbar** | AA | Fokus-Styling ist in zentralen Web-Komponenten vorhanden; kein formaler WCAG-Abnahmetest durchgeführt. | Teilweise verifiziert |
| **2.5.5 / 2.5.8 Touch Target** | AA/AAA | Mobile-Komponenten verwenden große Touchflächen; formale Messung aller Screens steht noch aus. | Teilweise verifiziert |
| **3.3.2 Beschriftungen & Anweisungen** | A | Formulare besitzen Beschriftungen und Hinweise; die vollständige Screen-Matrix ist noch nicht abgedeckt. | Teilweise verifiziert |
| **4.1.3 Statusmeldungen** | AA | Lade-, Fehler- und Mutationszustände sind vorhanden; `aria-live`-Abdeckung für Tracking/Chat ist noch offen. | Teilweise verifiziert |

> **Hinweis:** Die Tabelle ist keine formale WCAG-Zertifizierung. Für eine echte Konformitätserklärung sind ein manueller Screenreader-, Tastatur-, Kontrast- und Gerätetest erforderlich.

---

## 6. Offene Punkte und nächste Schritte

### Priorität 1 – Produktreife

1. Echte Routenberechnung (z. B. OSRM) und die verbleibenden Kartenfunktionen für Mobile und Web integrieren.
2. Native Live-Tracking-Funktionen mit Geofence, Broadcast und vollständigen Gerätetests fertigstellen.
3. Offline-Synchronisierung der öffentlichen Notfallkarte und QR-/Gerätetests ergänzen.
4. Vermisst-Tier-Sichtungen inklusive Foto-Upload, Detailansicht und Tasso-Prozess ergänzen.
5. Rich-Push-Flows, Notification-Deep-Links und Entwarnungsaktionen auf realen Android-Geräten testen.

### Priorität 2 – Plattformfunktionen

1. Web-Buchungsdetail, Web-Chat und Mediengalerie ergänzen.
2. Event-Erstellung, Teilnehmerübersicht und Community-Moderation ergänzen.
3. Tierprofil-Formular um strukturierte Medikamente, Allergien und Tierarztinformationen erweitern.
4. Native Passkeys in einem Expo-Development-Build validieren.
5. Authentifizierte Playwright-/Detox- und native Gerätetests sowie CI-Checks für die Hauptjourneys ausbauen.

### Priorität 3 – Integrationen und Betrieb

1. Tasso, SmartLock, Tierarzt-/Polizei-Direktwahl und Versicherungsprozesse fachlich spezifizieren.
2. Apple-Team-ID und Android-SHA256-Fingerprints für die `.well-known`-Endpoints konfigurieren.
3. Supabase-Typen regelmäßig aus dem Remote-Schema generieren und in CI validieren.
4. Datenschutz-, Standort- und Aufbewahrungskonzept für GPS, Fotos, Notfall- und Verifizierungsdaten finalisieren.

### Aktueller technischer Referenzstand

- Gefahrenmeldungen werden aktuell sofort als `active` veröffentlicht und nach Ablauf ausgeblendet.
- „Bereich gesäubert“ und „Gefahr besteht weiterhin“ werden über den authentifizierten RPC
  `record_hazard_sighting` gespeichert.
- Öffentliche Notfallkarten verwenden widerrufbare SHA-256-Tokens; private Medien werden über kurzlebige
  Signed URLs ausgeliefert.
- Push-Präferenzen, Tracking-Positionen, Distanz und Dauer werden serverseitig berücksichtigt bzw. berechnet.
- Letzte angewendete Remote-Migration: `049_fix_hazard_sighting_geography_assignment.sql`
- Letzter Remote-Commit: nicht Bestandteil dieses lokalen Standabgleichs
- Bewusst nicht überschreiben: `packages/supabase/src/auth/index.ts`, `supabase/config.toml`
