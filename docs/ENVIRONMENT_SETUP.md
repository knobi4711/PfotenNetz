# PfotenNetz Environment Setup

## Übersicht

Dieses Dokument beschreibt die Environment-Konfiguration für das PfotenNetz-Projekt.

**Supabase Project ID:** `njkyujhbcolvtcnlahsk`  
**Supabase URL:** `https://njkyujhbcolvtcnlahsk.supabase.co`

---

## Environment-Variablen

### Öffentliche Client-Konfiguration (dürfen in Client-Bundles gelangen)

Diese Werte sind öffentlich und werden in der Client-Anwendung (Expo/React Native, Next.js, Browser) verwendet.

| Variable                        | Framework         | Beschreibung                                 |
| ------------------------------- | ----------------- | -------------------------------------------- |
| `SUPABASE_URL`                  | Generic           | Supabase Project URL (Fallback)              |
| `SUPABASE_ANON_KEY`             | Generic           | Öffentlicher Anon/Publishable Key (Fallback) |
| `EXPO_PUBLIC_SUPABASE_URL`      | Expo/React Native | Explizit für Expo-Bundler                    |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Expo/React Native | Explizit für Expo-Bundler                    |
| `NEXT_PUBLIC_SUPABASE_URL`      | Next.js           | Explizit für Next.js-Bundler                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js           | Explizit für Next.js-Bundler                 |

**Auflösungs-Reihenfolge im Code:**

1. Framework-spezifisch (`EXPO_PUBLIC_*` / `NEXT_PUBLIC_*`)
2. Generic Fallback (`SUPABASE_*`)

### Geheime Werte (NIEMALS in Client-Bundles)

| Variable                    | Verwendungszweck                                         | Sicherheit                                                                                           |
| --------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`     | Supabase CLI (`supabase link`, `supabase db push`, etc.) | **Strikt geheim** – darf nicht in `EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`, `app.json`, Client-Code gelangen |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverseitige Admin- und Testdaten-Skripte               | **Strikt geheim** – niemals an Clients ausliefern oder committen                                     |

---

## Dateien

### `.env` (lokal, nicht in Git)

```env
SUPABASE_URL=https://njkyujhbcolvtcnlahsk.supabase.co
SUPABASE_ANON_KEY=<dein-anon-key>
EXPO_PUBLIC_SUPABASE_URL=https://njkyujhbcolvtcnlahsk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
NEXT_PUBLIC_SUPABASE_URL=https://njkyujhbcolvtcnlahsk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
SUPABASE_ACCESS_TOKEN=<dein-cli-access-token>
SUPABASE_SERVICE_ROLE_KEY=<dein-service-role-key>
```

### `.env.example` (Versioniert, Template)

Enthält dieselben Variablen **ohne** echte Werte. Zum Kopieren nach `.env` gedacht.

---

## Git-Sicherheit

`.gitignore` enthält:

```gitignore
.env
.env.*
!.env.example
```

**Prüfung:**

```powershell
git status --short
```

→ `.env` darf **nicht** als neue/geänderte Datei auftauchen.

---

## Supabase CLI Setup

### 1. Access Token besorgen

- Supabase Dashboard → Settings → Access Tokens → Create Token
- Token in `.env` eintragen: `SUPABASE_ACCESS_TOKEN=...`

### 2. Token für CLI verfügbar machen (PowerShell)

```powershell
# Variante A: Aus .env laden
$env:SUPABASE_ACCESS_TOKEN = (Get-Content .env | Select-String 'SUPABASE_ACCESS_TOKEN=').Line.Split('=')[1]

# Variante B: Direkt setzen
$env:SUPABASE_ACCESS_TOKEN = "dein-token"
```

### 3. Projekt verknüpfen

```powershell
supabase link --project-ref njkyujhbcolvtcnlahsk
```

Bei Aufforderung zum Datenbankpasswort: **Selbst im Terminal eingeben**, nicht kopieren.

---

## Client-Konfiguration im Code

Zentrale Konfiguration in:

```
packages/supabase/src/client/createClient.ts
```

Die Funktion `getSupabaseConfig()` löst die Variablen in dieser Reihenfolge auf:

1. `EXPO_PUBLIC_*` (Expo/React Native)
2. `NEXT_PUBLIC_*` (Next.js/Web)
3. `SUPABASE_*` (Generic Fallback)

Der `SUPABASE_ACCESS_TOKEN` wird **niemals** im Client-Code verwendet.

---

## Für neue Entwickler

1. Repo klonen
2. `.env.example` → `.env` kopieren
3. Werte aus Supabase Dashboard eintragen:
   - Project URL (bereits in `.env.example`)
   - `anon` / `publishable` Key
   - `SUPABASE_ACCESS_TOKEN` (für CLI-Arbeit)
4. In PowerShell: `$env:SUPABASE_ACCESS_TOKEN = "..."` setzen
5. `supabase link --project-ref njkyujhbcolvtcnlahsk` ausführen
6. `pnpm install` && `pnpm typecheck`

---

## Sicherheits-Checkliste

- [ ] `.env` in `.gitignore` (✅)
- [ ] `.env.example` ohne Secrets (✅)
- [ ] Keine Secrets in `app.json` / `app.config.*` (✅)
- [ ] `SUPABASE_ACCESS_TOKEN` nicht in Client-Code importiert (✅)
- [ ] Keine Secrets in Build/Logs (✅)
- [ ] `git status --short` zeigt `.env` nicht (✅)

---

## Auth-E-Mails (Registrierung, Passwort-Reset)

Im Hosted-Projekt verschickt Supabase Bestätigungs- und Reset-Mails standardmäßig
über den **eingebauten Mailer**. Der ist stark gedrosselt (aktuell
`rate_limit_email_sent = 2`, also zwei Mails pro Stunde und Projekt) und
antwortet bei Überschreitung mit HTTP 429 und `email rate limit exceeded`.
Die App fängt das ab und zeigt eine deutsche Meldung mit Wartehinweis –
beheben lässt sich die Ursache nur im Projekt.

### Geschlossener Test: Bestätigung ist aus

Das Hosted-Projekt `njkyujhbcolvtcnlahsk` läuft derzeit mit
**Auto-Confirm** (`mailer_autoconfirm = true`). Registrierungen erhalten sofort
eine Sitzung, es wird keine Bestätigungs-Mail verschickt, und das E-Mail-Limit
greift bei der Registrierung nicht. Passwort-Reset-Mails sind davon **nicht**
betroffen – die laufen weiter über den gedrosselten Mailer.

Setzen bzw. wieder abschalten (Management API, nur dieses eine Feld):

```powershell
# Token aus .env laden (niemals im Klartext ausgeben)
$token = (Get-Content .env | Select-String '^SUPABASE_ACCESS_TOKEN=').Line -replace '^SUPABASE_ACCESS_TOKEN=', ''
$ref   = (Get-Content supabase\.temp\project-ref).Trim()

Invoke-RestMethod -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType 'application/json' `
  -Body (@{ mailer_autoconfirm = $true } | ConvertTo-Json)   # $false = Bestätigung wieder an

# Kontrolle
Invoke-RestMethod -Method Get `
  -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" `
  -Headers @{ Authorization = "Bearer $token" } |
  Select-Object mailer_autoconfirm, rate_limit_email_sent
```

Dashboard-Äquivalent: **Authentication → Sign In / Providers → Email →
„Confirm email“** aus- bzw. einschalten.

**Vor der Produktionsfreigabe:** `mailer_autoconfirm` wieder auf `false` setzen,
Bestätigungsmails aktivieren und vorher einen eigenen SMTP-Provider einrichten –
sonst laufen neue Nutzer:innen sofort in dasselbe Limit.

**SMTP-Einrichtung:** vollständige Anleitung (Brevo, Cloudflare-DNS, deutsches
Template-Setup, Test) in [`docs/auth-emails.md`](./auth-emails.md). Kurzfassung:

```powershell
# SMTP-Zugangsdaten in .env eintragen (siehe .env.example), dann:
pnpm auth:mail            # Dry-Run
pnpm auth:mail --apply    # SMTP + Rate Limit + deutsche Texte
```

Eigene E-Mail-Texte erlaubt Supabase im Free-Tier erst, nachdem ein eigener
SMTP-Provider hinterlegt ist.

**Hinweis:** `supabase/config.toml` gilt nur für die lokale Entwicklung
(`[auth.email] max_frequency = "1s"`, `enable_confirmations = false`). Die
Hosted-Einstellungen liegen im Dashboard; `supabase config push` nicht
verwenden, weil es auch `site_url = "http://localhost:3000"` überschreiben würde.

---

## Remote-Migrationen

Der read-only Check vom 23. September 2026 zeigt, dass die lokalen Migrationen `000` bis `026`
auch im verknüpften Remote-Projekt registriert sind.

Vor weiteren Datenbankänderungen immer zuerst prüfen:

```powershell
supabase migration list
```

Ohne aktuellen Remote-Preflight **nicht ausführen**:

- `supabase db push`
- `supabase db reset`
- `supabase migration up`
