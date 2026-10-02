# Android-Gerätetests

Die mobile App ist für Android-Development-Builds vorbereitet. Expo Go ist
für Push, Hintergrund-Tracking, Geofencing und native Passkeys keine gültige
Testumgebung.

## Voraussetzungen

- Android Studio mit Android SDK, Emulator und `adb`, oder ein Android-Gerät
  mit aktiviertem USB-Debugging
- Expo-Konto und EAS CLI für Cloud-Builds
- `.env` mit den Supabase-Variablen für eine erreichbare Testumgebung

Prüfen:

```powershell
adb devices
pnpm --filter @pfotennetz/mobile doctor
```

## Development-Build erstellen

Aus `apps/mobile` oder über das Root-Workspace:

```powershell
pnpm --filter @pfotennetz/mobile build:android:dev
```

Der Build erzeugt eine installierbare APK. Nach der Installation den
Development-Server starten:

```powershell
pnpm --filter @pfotennetz/mobile dev -- --dev-client
```

Für einen lokalen Build mit installiertem Android SDK:

```powershell
pnpm --filter @pfotennetz/mobile test:android:local
```

## Abnahmeläufe

1. Anmeldung und Push-Berechtigung erlauben.
2. Buchung öffnen und Route zum Treffpunkt starten.
3. Als Helfer eine bestätigte Buchung starten und Standortberechtigung auf
   „Immer zulassen“ setzen.
4. App minimieren, Emulatorstandort ändern und Tracking-Position prüfen.
5. Netzwerk deaktivieren, weitere Positionen erzeugen, Netzwerk aktivieren und
   prüfen, dass die Offline-Queue ohne Duplikate geleert wird.
6. Geofence betreten/verlassen und jeden Übergang nur einmal erwarten.
7. Notfallkarte mit gültigem, abgelaufenem und widerrufenem QR-Link prüfen.
8. Native Passkey-/Biometrieflüsse nur im Development-Build prüfen.

## Durchgeführter Gerätesmoke-Test

- Android-Development-Build auf `24094RAD4G` installiert
- App per ADB gestartet; `MainActivity` blieb sichtbar
- Temporäres, bestätigtes Testkonto angelegt und in der App angemeldet
- Authentifiziertes Dashboard im UI-Automator-Baum erkannt
- Temporäres Auth-Konto anschließend wieder gelöscht
- App-Neustart und `pfotennetz://`-Deep-Link ohne Absturz geprüft
- Android-Berechtigungen für Benachrichtigungen, Vordergrundstandort, Hintergrundstandort und Biometrie vorhanden
- Hauptnavigation `Karte`, `Anfragen`, `Tiere` und `Profil` auf dem Gerät geöffnet; alle Tabs laden ohne Absturz und zeigen den unauthentifizierten Zustand korrekt an
- Authentifizierter Tier-Smoke-Test mit temporärem Konto: Tierprofil geladen, Notfallkarte geöffnet und Testkonto/Tier anschließend gelöscht
- App-Hintergrund-/Vordergrundwechsel geprüft: Prozess blieb erhalten, App kam ohne Crash zurück in den Vordergrund
- Offline-Smoke-Test: WLAN/Mobilfunk deaktiviert, App reaktiviert und ohne Crash geprüft; Netzwerk anschließend wieder aktiviert
- Fingerprint-Login mit leerem lokalen Zustand auf dem Gerät geprüft: keine Fingerprint-Aktion wird angeboten und kein blockierender Ladezustand entsteht
- Fingerprint-Regressionstest: ungültige lokale Zugangsdaten werden bereinigt; ein nicht antwortender Login endet nach 15 Sekunden mit einer Fehlermeldung
- Persistente Offline-Tracking-Queue implementiert und mit 3 Unit-Tests abgesichert; Geräteabnahme mit echter Offline-Route steht noch aus
- Geofence-Exit-Deduplizierung implementiert und mit Zustandsautomat-Tests abgesichert; echte GPS-Ein-/Austritte stehen noch aus
- Native QR-Scanner-Route `/scan` und öffentliche Kartenansicht implementiert; gültige, fremde und manipulierte Notfallkarten-URLs werden geprüft, Geräte-Scan und Offline-Snapshot stehen noch aus

## Aktueller Hoststatus

Die offiziellen Google Android SDK Platform-Tools sind installiert. Das Testgerät
ist per ADB verbunden. Für lokale APK-Builds fehlt
separat weiterhin die vollständige Android-Studio/SDK-/Java-Toolchain; alternativ
kann der Development-Build über EAS erzeugt und anschließend per APK installiert
werden.
