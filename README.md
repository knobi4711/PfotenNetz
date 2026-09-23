# PfotenNetz

PfotenNetz ist eine Nachbarschaftsplattform für Haustierbetreuung. Das Repository ist ein
pnpm-/Turborepo-Monorepo mit einer Expo-App, einer Next.js-Web-App und gemeinsam genutzten
Paketen.

## Struktur

- `apps/mobile` – Expo SDK 57 / React Native App
- `apps/web` – Next.js Web-App
- `packages/design-system` – gemeinsame Design-Tokens und UI-Grundlagen
- `packages/native` – native Dienste wie Biometrie und Standort-Tracking
- `packages/shared` – gemeinsame Typen, Validierung und Hilfsfunktionen
- `packages/supabase` – Supabase-Client, Queries und Authentifizierung
- `packages/testing` – gemeinsame Testkonfiguration
- `supabase` – lokale Supabase-Konfiguration und SQL-Migrationen

## Voraussetzungen

- Node.js 22.13 oder neuer
- pnpm 9 oder neuer
- Supabase CLI 2.x für Datenbankarbeiten
- Docker Desktop nur für die lokale Supabase-Umgebung

## Einrichtung

```powershell
Copy-Item .env.example .env
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

Die benötigten Variablen und Hinweise zum sicheren Umgang mit Zugangsdaten stehen in
[`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md).

## Entwicklung

Alle Apps starten:

```powershell
pnpm dev
```

Nur die mobile App starten:

```powershell
pnpm --filter @pfotennetz/mobile dev
```

Nur die Web-App starten:

```powershell
pnpm --filter @pfotennetz/web dev
```

## Qualitätsprüfungen

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @pfotennetz/mobile doctor
```

Datenbankmigrationen werden nicht automatisch auf das verknüpfte Remote-Projekt übertragen.
Vor `supabase db push` ist immer ein aktueller Remote-Preflight erforderlich.
