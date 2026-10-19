#!/bin/sh
set -eu

project='/volume2/docker-projects/pfotennetz'
staging='/home/hagen/pfotennetz-upload'

if [ "$#" -ne 0 ]; then
  echo 'This deploy command does not accept arguments.' >&2
  exit 2
fi

for directory in next-standalone next-static web-public; do
  test -d "$staging/$directory"
done

rm -rf "$project/next-standalone" "$project/next-static" "$project/web-public"
mkdir -p "$project/next-standalone" "$project/next-static" "$project/web-public"

cp -a "$staging/next-standalone/." "$project/next-standalone/"
cp -a "$staging/next-static/." "$project/next-static/"
cp -a "$staging/web-public/." "$project/web-public/"

# Docker needs these mount points to exist inside the read-only standalone bind mount.
mkdir -p \
  "$project/next-standalone/apps/web/public" \
  "$project/next-standalone/apps/web/.next/static" \
  "$project/next-standalone/apps/web/.next/cache"

cd "$project"
docker compose up -d --force-recreate
docker compose ps
