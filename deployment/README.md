# PfotenNetz Web-Deployment

Die öffentliche Website verwendet die Stitch-Weboberfläche aus `apps/web` (Next.js). Der Expo-Mobile-Export aus `apps/mobile/dist` wird nicht über die Domain ausgeliefert.

## Produktionsbuild auf Windows

```powershell
pnpm --filter @pfotennetz/web build
```

Der Build erzeugt `apps/web/.next/standalone`, `apps/web/.next/static` und `apps/web/public`.
Die beiden letztgenannten Verzeichnisse müssen ebenfalls übertragen werden: Der
Standalone-Server enthält CSS/JS und öffentliche Assets nicht automatisch.

## Dateien übertragen

Ziel ist das NAS unter `hagen@192.168.188.42`. Im Shell-Zugang liegt der Upload-Ordner
unter `/home/hagen/pfotennetz-upload`; der SFTP-Zugang zeigt dasselbe Verzeichnis als
`/home/pfotennetz-upload`. Beim `scp` deshalb den SFTP-Pfad verwenden. Übertragen werden
gepackte Tarballs, damit die bestehende Installation erst nach vollständigem Upload
und Backup ersetzt wird:

```powershell
$tag = 'a11y-0.3.6'
$tmp = "$env:TEMP\pfdeploy"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
tar -czf "$tmp\pf-web-standalone-$tag.tar.gz" -C apps\web\.next\standalone .
tar -czf "$tmp\pf-web-static-$tag.tar.gz"     -C apps\web\.next\static .
tar -czf "$tmp\pf-web-public-$tag.tar.gz"     -C apps\web\public .
scp -i C:\Users\knobl\.ssh\id_ed25519 "$tmp\pf-web-*-$tag.tar.gz" hagen@192.168.188.42:/home/pfotennetz-upload/
scp -i C:\Users\knobl\.ssh\id_ed25519 .\deployment\pfotennetz-deploy.sh hagen@192.168.188.42:/home/pfotennetz-upload/
```

Ein `scp` direkt nach `/home/hagen/pfotennetz-upload/` scheitert, weil der SFTP-Zugang
in einer anderen Wurzel startet.

## Container aktualisieren

Das Skript `deployment/pfotennetz-deploy.sh` liegt nach dem Upload neben den Tarballs.
Es prüft die drei Archive, sichert den laufenden Stand als
`pfotennetz-before-<Zeitstempel>.tar.gz`, tauscht die drei Verzeichnisse und startet den
Container neu:

```powershell
ssh -i C:\Users\knobl\.ssh\id_ed25519 hagen@192.168.188.42 `
  "sh /home/hagen/pfotennetz-upload/pfotennetz-deploy.sh a11y-0.3.6"
```

Die Verzeichnisse werden bewusst umbenannt statt geleert: Die ausgelieferten Builds sind
schreibgeschützt, und `/volume2/docker-projects/pfotennetz` gehört root. `docker-compose.yml`
und `Caddyfile.pfotennetz` liegen im Upload-Verzeichnis und müssen nur bei Änderungen erneut
übertragen werden.

Der Container hört intern auf Port 3000 und veröffentlicht keinen Host-Port. Paperless auf Port 8000 bleibt unverändert.
`docker-compose.yml` bindet `next-static` und `web-public` unter den von Next.js erwarteten
Pfaden ein, damit Stylesheets, JavaScript und das Logo ausgeliefert werden. Der benannte
Docker-Volume `next-cache` bleibt für Next.js-Bildoptimierung und Laufzeit-Cache beschreibbar,
obwohl der übrige Standalone-Container read-only eingebunden ist.

## Caddy aktualisieren

Den bisherigen Block mit `respond "PfotenNetz läuft"` ersetzen durch:

```caddy
pfotennetz.app {
    reverse_proxy pfotennetz-web:3000
}

www.pfotennetz.app {
    redir https://pfotennetz.app{uri} permanent
}
```

Danach:

```bash
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Tests

```bash
docker run --rm --network caddy_proxy curlimages/curl:8.10.1 -fsSI http://pfotennetz-web:3000/
curl -I https://pfotennetz.app
```

## App-Release mit Web-Abgleich

`apps/web/next.config.js` liest die App-Version beim Build aus `apps/mobile/app.json` und
zeigt sie im Dashboard an. Deshalb gehört zu **jedem** Mobile-Release auch ein neuer
Web-Build und ein Deployment – sonst bleibt im Dashboard die alte Version stehen.

Ablauf bei jedem App-Release:

1. In `apps/mobile/app.json` `version` und `versionCode` erhöhen (und den lokalen
   `apps/mobile/android/app/build.gradle`-Stand angleichen).
2. AAB bauen (`apps/mobile/android`: `./gradlew.bat app:bundleRelease`) und mit
   `pnpm --filter @pfotennetz/mobile upload:android:local` zu Google Play hochladen.
3. `pnpm --filter @pfotennetz/web build` ausführen und den Web-Deploy wie oben beschrieben.
4. Live prüfen, dass die neue Version im ausgelieferten Dashboard-Chunk enthalten ist.
