# Phase-3-Abnahmeplan

Dieser Plan deckt die nächsten fünf offenen Punkte aus
`pfotennetz_gesamte_plattform.md` ab. Schritte mit echter Hardware, einem
Development Build, Staging-Konten oder einem externen Tasso-Vertrag können
nicht durch statische CI-Tests ersetzt werden.

## 1. Native Live-Tracking-Funktionen

**Voraussetzung:** Expo-Development-Build auf mindestens einem physischen
Android- und iOS-Gerät.

| Test | Erwartung | Status |
| --- | --- | --- |
| Tracking im Vordergrund starten/stoppen | Session wird angelegt und sauber beendet | Ausstehend |
| App in den Hintergrund schicken | Positionen werden weiter gepuffert | Ausstehend |
| Geofence betreten/verlassen | Event wird genau einmal je Übergang verarbeitet | Software-seitig abgesichert, Geräteabnahme ausstehend |
| Offline gehen und zurückkehren | Persistente Queue bleibt erhalten und wird nach erfolgreicher Synchronisierung geleert | Implementiert, Geräteabnahme ausstehend |
| Live-Broadcast mit zweitem Konto | Position und Zeitstempel aktualisieren sich ohne Reload | Ausstehend |
| Berechtigung verweigern/widerrufen | Verständlicher Fehler, kein endloses Retry | Ausstehend |

## 2. Tasso und automatische Vermisst-Tier-Synchronisierung — zurückgestellt

Die Implementierung wird vorerst nicht weiterverfolgt. Sie bleibt bis zu einer
späteren Produktentscheidung pausiert und ist nicht Teil der aktuellen
Abnahmesprints.
Vor dem Adapter müssen Tasso-API, Authentifizierung, Einwilligung, übertragbare
Felder, `missing_pets.tasso_id`, Konfliktregeln, Retry/Idempotenz,
Webhook-Signaturen, Audit-Protokoll und Löschung geklärt werden.

**Abnahmekriterium:** Ein synchronisierter Testfall überträgt keine privaten
Felder oder exakten Standorte, ist wiederholbar und erzeugt keine doppelten
Vermisstmeldungen.

## 3. Native Geräte-/Development-Build-Matrix

Mindestens ein aktuelles iPhone und Android-Gerät werden mit WLAN/Mobilfunk,
gesperrtem Bildschirm und aktivierter Akkuoptimierung geprüft. Die Matrix
deckt Push, Tracking, Geofence, QR-Scan und Offline-Modus ab. Der native
QR-Scanner ist unter `/scan` implementiert. Für QR werden
gültige, widerrufene, abgelaufene und offline geladene Links geprüft.

Expo Go gilt für Push, Hintergrundtracking und native Passkeys ausdrücklich
nicht als Abnahmeumgebung.

## 4. Authentifizierte Web-Flows mit Staging-Konten

| Konto | Zweck |
| --- | --- |
| `staging-seeker` | Buchung erstellen, stornieren, Notfallkarte ansehen |
| `staging-helper` | Anfrage annehmen, Tracking starten, Chat/Medien nutzen |
| `staging-admin` | Moderation, Verifizierung und Prüfpfade |

Die Konten verwenden künstliche Daten, werden nicht mit Produktion vermischt
und nach jedem Lauf zurückgesetzt. Die vorhandenen Playwright-Flows werden
anschließend mit echten Sessions statt Route-Mocks ausgeführt.

Der automatisierbare Web-Anteil läuft bereits als verpflichtender CI-Schritt
nach dem Build. Die aktuellen 18 Smoke-/Flow-Tests verwenden weiterhin
isolierte Route-Mocks; echte Staging-Sessions ersetzen diese Mocks erst nach
Bereitstellung der drei oben beschriebenen Konten.

Der Kontaktanfrage-E2E-Flow prüft den eingehenden Status „Offen“, die Annahme
über `respond_contact_request` und den anschließenden Status „Angenommen“.
Push-Zustellung und der geräteübergreifende Chat-Anschluss bleiben Teil der
nativen Abnahme.

Zusätzliche Remote-E2E-Smokes decken den Buchungsstatus-Lifecycle
`requested → confirmed → in_progress → completed` sowie eine Tracking-Session
mit zwei Positionspunkten und sauberem Abschluss ab. Die erzeugten Nutzer,
Tiere, Buchungen und Trackingdaten werden nach jedem Lauf gelöscht.

## 5. Native Passkeys

**Voraussetzung:** Expo-Development-Build, konfigurierte Associated Domains,
Apple-Team-ID bzw. Android-SHA256-Fingerprint und ein Gerät mit Biometrie.

1. Registrierung mit bestehendem Konto durchführen.
2. App schließen und Passkey-Anmeldung ausführen.
3. Abbruch und falsche Biometrie prüfen.
4. Passkey im Profil umbenennen und widerrufen.
5. Erneute Anmeldung nach Widerruf muss abgelehnt werden.

Erst danach darf der Native-Passkey-Status von „PoC“ auf „validiert“ wechseln.
