# PfotenNetz – WebApp Deployment Prompt für VS / OpenCode / ChatGPT Luna

Du arbeitest im bestehenden Projekt **„PfotenNetz“**.

## Ziel

Die vorhandene Expo-/React-Native-App soll zusätzlich als Web-App gebaut und anschließend auf meinem eigenen Linux-Mini-PC unter

`https://pfotennetz.app`

bereitgestellt werden.

## Wichtige Rahmenbedingungen

- Arbeite ausschließlich im bestehenden PfotenNetz-Projekt.
- Bestehende Android-/iOS-Funktionalität darf nicht beschädigt werden.
- Bestehende Supabase-Anbindung darf nicht ersetzt werden.
- Keine unnötigen Refactorings.
- Keine Änderungen an Datenbank/Migrationen, sofern sie für den Web-Build nicht zwingend notwendig sind.
- Keine Secrets/API-Keys im Quellcode ausgeben.
- Vor Änderungen immer zuerst den aktuellen Projektzustand analysieren.
- Änderungen möglichst klein, nachvollziehbar und reproduzierbar halten.

---

# Aktueller Stand

## Projekt

**PfotenNetz**

## Technik

- Expo / React Native
- Supabase als Backend
- Zielplattformen:
  - Android
  - iOS
  - Web

Die Mobile-App läuft bereits.

Login/Supabase funktionieren grundsätzlich.

Das Projekt liegt auf meinem Windows-Entwicklungsrechner ungefähr unter:

`C:\pn`

Die Expo-App befindet sich bisher unter:

`C:\pn\apps\mobile`

Bitte zuerst selbst anhand der vorhandenen Dateien verifizieren:

- tatsächlicher Projektroot
- `package.json`
- Expo-Konfiguration
- `expo-router` bzw. Navigation
- Web-Konfiguration
- vorhandene Scripts
- Umgebungsvariablen
- vorhandene `.env`-Dateien
- verwendete Expo-Version
- verwendete React-Native-Version
- Supabase-Konfiguration

---

# Server-Infrastruktur

Die Web-App soll später auf meinem eigenen Linux-Mini-PC laufen.

## Server

- Linux Mint 21
- Docker / Docker Compose vorhanden
- Rechner läuft dauerhaft
- Paperless-NGX läuft bereits auf demselben Rechner
- Paperless darf nicht verändert oder beeinträchtigt werden

## Bestehende Container

- `paperless-webserver-1`
- `paperless-db-1`
- `paperless-redis-1`

Paperless verwendet:

`Port 8000`

PfotenNetz soll **NICHT** Port 8000 verwenden.

## Caddy

Auf dem Server ist zusätzlich bereits Caddy als Reverse Proxy eingerichtet.

- Caddy läuft als Docker-Container
- Ports 80 und 443 sind belegt
- HTTPS funktioniert bereits
- Domain:

`https://pfotennetz.app`

Aktuell liefert Caddy dort nur eine Testantwort:

`PfotenNetz läuft`

Die öffentliche Domain und HTTPS funktionieren bereits vollständig.

## DNS

- Cloudflare
- `pfotennetz.app` zeigt auf meinen Heimanschluss
- Dynamic DNS ist bereits eingerichtet
- Cloudflare-DDNS läuft über `systemd` automatisch alle 5 Minuten

Server-Verzeichnis für die zukünftige Web-App:

`/mnt/Daten/pfotennetz`

Caddy liegt unter:

`/mnt/Daten/caddy`

---

# Aufgabe

Bereite das bestehende PfotenNetz-Projekt so vor, dass eine produktionsfähige Expo-Web-Version erzeugt werden kann.

Arbeite Schritt für Schritt.

---

# Phase 1 – Projektanalyse

Prüfe zuerst:

1. Projektstruktur
2. `package.json`
3. Expo-Konfiguration
4. Router/Navigation
5. Web-Unterstützung
6. vorhandene Dependencies
7. `.env`-Verwendung
8. Supabase-Konfiguration
9. platform-spezifischen Code
10. Bibliotheken, die eventuell nicht im Browser funktionieren

Erstelle danach zunächst einen kurzen Bericht:

- Was ist bereits webfähig?
- Was verhindert aktuell einen Web-Build?
- Welche Änderungen sind zwingend notwendig?
- Welche Änderungen sind nur optional?

Noch keine großen Änderungen vornehmen, bevor diese Analyse abgeschlossen ist.

---

# Phase 2 – Web-Build ermöglichen

Ziel ist, dass folgender Befehl erfolgreich funktioniert:

```powershell
npx expo export --platform web
```

Der fertige statische Build soll in:

`dist`

landen.

Bevorzugt soll eine statische Web-Ausgabe verwendet werden.

Prüfe die Expo-Konfiguration und verwende, falls zur vorhandenen Expo-Version passend:

```json
{
  "web": {
    "output": "static"
  }
}
```

Nur setzen, wenn dies mit der tatsächlich installierten Expo-Version korrekt ist.

---

# Phase 3 – Umgebungsvariablen

Prüfe besonders die vorhandenen Supabase-Variablen.

Bekannt sind bisher u. a.:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Diese dürfen im Web-Build verwendet werden, sofern dies dem bestehenden Supabase-Konzept entspricht.

Keine Service-Role-Keys oder sonstigen geheimen Backend-Schlüssel in den Web-Build übernehmen.

Falls Variablen fehlen oder anders organisiert werden müssen:

- dokumentieren
- minimal anpassen
- keine Secrets erfinden

---

# Phase 4 – Web-Kompatibilität

Prüfe alle verwendeten React-Native-/Expo-Komponenten auf Web-Kompatibilität.

Besonders prüfen:

- Maps
- biometrische Anmeldung
- native APIs
- Notifications
- SecureStore
- Dateisystem
- Kamera
- Standort
- Push Notifications
- platform-spezifische Imports

Wenn eine Funktion auf Web nicht unterstützt wird:

**Nicht die Mobile-Funktion entfernen.**

Stattdessen möglichst:

```ts
Platform.OS === "web"
```

oder geeignete:

- `.web.ts`
- `.web.tsx`

Dateien verwenden.

Web soll sinnvoll degradieren, ohne Android/iOS zu beeinträchtigen.

---

# Phase 5 – Produktions-Build

Wenn alle notwendigen Anpassungen durchgeführt wurden:

```powershell
npx expo export --platform web
```

Anschließend prüfen:

- Build erfolgreich
- `dist` vorhanden
- `index.html` vorhanden
- JS/CSS/Assets vorhanden
- keine kritischen Build-Warnungen
- keine Secrets im `dist`-Verzeichnis

Zeige danach:

```powershell
Get-ChildItem .\dist
```

bzw. unter der aktuellen Shell einen gleichwertigen Befehl.

---

# Phase 6 – Deployment vorbereiten

Erstelle zusätzlich Deployment-Dateien für meinen Linux-Server.

Zielstruktur:

```text
/mnt/Daten/pfotennetz/
├── docker-compose.yml
├── nginx.conf
└── web/
    └── [Inhalt von dist]
```

Der Web-Container soll nur die statischen Dateien ausliefern.

Bevorzugt:

`nginx:alpine`

Der Container soll **NICHT** direkt öffentlich auf Port 80/443 lauschen, weil dort bereits Caddy läuft.

Mögliche Varianten:

### Variante A – nur lokal veröffentlichter Port

Beispiel:

`127.0.0.1:8081`

### Variante B – gemeinsames Docker-Netzwerk mit Caddy

Langfristig bevorzugt, wenn dies sauber und einfach umgesetzt werden kann.

Paperless darf dabei nicht verändert werden.

---

# Phase 7 – SPA / Routing

Falls Expo Router clientseitige Routen verwendet, muss nginx korrekt mit direkten URL-Aufrufen umgehen.

Beispiel:

```nginx
try_files $uri $uri/ /index.html;
```

Aber nur so konfigurieren, wie es zum tatsächlich erzeugten Expo-Web-Build passt.

---

# Phase 8 – Caddy-Konfiguration vorbereiten

Erstelle am Ende auch den notwendigen Caddy-Block.

Ziel:

```caddy
pfotennetz.app {
    reverse_proxy ...
}

www.pfotennetz.app {
    redir https://pfotennetz.app{uri}
}
```

Der bestehende Test:

```caddy
respond "PfotenNetz läuft"
```

soll später dadurch ersetzt werden.

HTTPS-Zertifikate werden bereits automatisch von Caddy verwaltet.

---

# Phase 9 – Deployment-Anleitung

Am Ende brauche ich eine konkrete Schritt-für-Schritt-Anleitung für den Linux-Server.

Beispielsweise:

1. Verzeichnis erstellen
2. `dist` übertragen
3. `docker-compose.yml` übertragen
4. `nginx.conf` übertragen
5. Docker-Netzwerk ggf. erstellen
6. Container starten
7. lokal mit `curl` testen
8. Caddy konfigurieren
9. Caddy validieren
10. Caddy neu laden
11. `https://pfotennetz.app` testen

Nutze konkrete Befehle.

---

# Wichtiges Arbeitsprinzip

Nicht einfach eine theoretische Anleitung schreiben.

Du befindest dich im echten PfotenNetz-Projekt.

Analysiere zuerst die tatsächlich vorhandenen Dateien und passe die Lösung daran an.

Wenn etwas bereits vorhanden ist:

**nicht neu erfinden.**

Wenn eine bestehende Konfiguration korrekt ist:

**beibehalten.**

Wenn du Änderungen machst:

- nenne jede geänderte Datei
- begründe kurz die Änderung

---

# Erwartetes Ergebnis

Am Ende brauche ich:

1. funktionierenden Web-Build
2. `dist`-Verzeichnis
3. Docker-Deployment für den Linux-Server
4. nginx-Konfiguration
5. Caddy-Konfiguration
6. konkrete Deployment-Befehle
7. kurze Liste aller vorgenommenen Projektänderungen

---

# Startanweisung

Beginne jetzt mit **Phase 1** und analysiere ausschließlich den aktuellen Projektzustand.

Nimm noch keine größeren Änderungen vor, bevor die Analyse abgeschlossen ist.
