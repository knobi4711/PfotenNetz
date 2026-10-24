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

Auf dem Server vorbereiten:

```bash
cd /mnt/Daten/pfotennetz
rm -rf next-standalone next-static web-public
mkdir -p next-standalone next-static web-public
```

Vom Windows-Entwicklungsrechner aus dem Repository-Root:

> Hinweis: Der bisherige Deploy-Host ist nicht mehr online. Die Zieladresse muss neu konfiguriert werden, bevor Dateien übertragen werden können.

```powershell
# scp -r .\deployment\docker-compose.yml <DEPLOY_HOST>:/<DEPLOY_PATH>/
# scp -r .\deployment\Caddyfile.pfotennetz <DEPLOY_HOST>:/<DEPLOY_PATH>/
# scp -r .\apps\web\.next\standalone\* <DEPLOY_HOST>:/<DEPLOY_PATH>/next-standalone/
# scp -r .\apps\web\.next\static\* <DEPLOY_HOST>:/<DEPLOY_PATH>/next-static/
# scp -r .\apps\web\public\* <DEPLOY_HOST>:/<DEPLOY_PATH>/web-public/
```

## Container starten

```bash
cd /mnt/Daten/pfotennetz
docker network inspect caddy_proxy >/dev/null 2>&1 || docker network create caddy_proxy
docker compose up -d
docker compose ps
```

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
