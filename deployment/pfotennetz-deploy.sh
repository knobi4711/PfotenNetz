#!/bin/sh
set -eu

# Deployt einen Web-Build in das laufende NAS-Setup.
#
# Aufruf auf dem NAS (im Upload-Verzeichnis /home/hagen/pfotennetz-upload):
#   sh pfotennetz-deploy.sh <tag>
#
# Erwartet dort die drei Tarballs
#   pf-web-standalone-<tag>.tar.gz
#   pf-web-static-<tag>.tar.gz
#   pf-web-public-<tag>.tar.gz
# und eine docker-compose.yml, die next-standalone, next-static und
# web-public als Bind-Mounts verwendet.

if [ "$#" -ne 1 ]; then
  echo "Aufruf: $0 <tag>" >&2
  echo "Beispiel: $0 a11y-0.3.6" >&2
  exit 2
fi

tag=$1
cd "$(dirname "$0")"

for part in standalone static public; do
  if [ ! -f "pf-web-$part-$tag.tar.gz" ]; then
    echo "Fehlt: pf-web-$part-$tag.tar.gz" >&2
    exit 1
  fi
done
if [ ! -f docker-compose.yml ]; then
  echo 'Fehlt: docker-compose.yml im Upload-Verzeichnis.' >&2
  exit 1
fi

incoming="incoming-$tag"
rm -rf "$incoming"
mkdir -p "$incoming/next-standalone" "$incoming/next-static" "$incoming/web-public"

tar -xzf "pf-web-standalone-$tag.tar.gz" -C "$incoming/next-standalone"
tar -xzf "pf-web-static-$tag.tar.gz" -C "$incoming/next-static"
tar -xzf "pf-web-public-$tag.tar.gz" -C "$incoming/web-public"

echo "--- neuer Build: $(cat "$incoming/next-standalone/apps/web/.next/BUILD_ID")"

stamp=$(date +%Y%m%d-%H%M)
backup="pfotennetz-before-${stamp}.tar.gz"
tar -czf "$backup" next-standalone next-static web-public
echo "--- Backup: $backup"

# Verzeichnisse werden getauscht statt in-place geleert: Die ausgelieferten
# Builds sind schreibgeschützt, ein "rm -rf" im Projektordner scheitert.
rm -rf next-standalone.old next-static.old web-public.old
mv next-standalone next-standalone.old
mv next-static next-static.old
mv web-public web-public.old

mv "$incoming/next-standalone" next-standalone
mv "$incoming/next-static" next-static
mv "$incoming/web-public" web-public
rm -rf "$incoming"

# Docker braucht diese Mount-Punkte im sonst schreibgeschützten Standalone-Baum.
mkdir -p next-standalone/apps/web/public
mkdir -p next-standalone/apps/web/.next/static
mkdir -p next-standalone/apps/web/.next/cache

docker compose up -d --force-recreate

echo "--- live Build: $(cat next-standalone/apps/web/.next/BUILD_ID)"
docker ps --filter name=pfotennetz-web --format '{{.Names}} {{.Status}}'
docker logs --tail 15 pfotennetz-web
