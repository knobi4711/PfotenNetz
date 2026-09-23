# Technische Abnahme PfotenNetz – Pre-Phase 3 Audit

**Datum:** 2026-09-20  
**Status:** Vollständige Code-Review aller relevanten Bereiche  
**Keine Änderungen durchgeführt** – nur Bestandsaufnahme

---

## 1. Expo / React – Installierte Versionen

| Package                       | Version               | Quelle            |
| ----------------------------- | --------------------- | ----------------- |
| **expo**                      | 57.0.24               | Root package.json |
| **react**                     | 19.2.3                | Root package.json |
| **react-native**              | 0.86.3                | Root package.json |
| **react-native-web**          | 0.21.2                | npm list          |
| **expo-router**               | 57.0.22               | Root package.json |
| **expo-location**             | 57.0.19               | packages/native   |
| **expo-local-authentication** | 57.0.3                | packages/native   |
| **expo-secure-store**         | 57.0.4                | packages/native   |
| **react-native-maps**         | **NICHT INSTALLIERT** | —                 |
| **@supabase/supabase-js**     | 2.116.0               | packages/supabase |

### `npx expo-doctor` Ergebnis

```
✅ 21/21 checks passed. No issues detected!
```

### Bewertung: 🟢 **Expo Setup korrekt und konsistent**

Alle Kern-Packages auf Expo SDK 57 abgestimmt. `react-native-maps` fehlt noch (wird für Tracking/Karten benötigt).

---

## 2. Supabase Client – `packages/supabase/src/client/createClient.ts`

### Code-Analyse

```typescript
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
```

### Probleme

| #   | Datei                   | Stelle           | Problem                                                                                                                                                                                                     | Schwere |
| --- | ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | `createClient.ts:27`    | `storage` Config | **Einheitlich `window.localStorage` für alle Plattformen** – funktioniert auf Web, aber **nicht auf Native (iOS/Android)** und **nicht im SSR**. Expo/React Native hat kein `window` Objekt zur Build-Zeit. | 🔴      |
| 2   | `createClient.ts:6-11`  | Env-Check        | Throw bei fehlenden Env-Vars – **bricht SSR/Build** (z. B. `expo export`, `eas build`) ab, da `process.env` dort nicht verfügbar ist.                                                                       | 🟡      |
| 3   | `createClient.ts:14-32` | Singleton        | Keine Plattform-spezifische Instanzierung. Mobile braucht `expo-secure-store` oder `AsyncStorage`, Web `localStorage`, SSR gar keine Persistenz.                                                            | 🔴      |

### Erwartete Architektur (nicht implementiert)

```typescript
// Pseudo-Code für korrekte Trennung
const getStorage = () => {
  if (Platform.OS === 'web') return window.localStorage;
  if (Platform.OS === 'native') return ExpoSecureStoreAdapter; // oder MMKV
  return undefined; // SSR
};
```

### Bewertung: 🔴 **Supabase Client – Kritische Plattform-Probleme**

---

## 3. Passkeys – `packages/supabase/src/auth/passkeys.ts`

### Implementierte Funktionen vs. `@supabase/supabase-js@2.116.0` Types

| Funktion              | Code                                             | Supabase JS v2 Types                                                                         | Status    |
| --------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- | --------- |
| `registerPasskey()`   | `auth.registerPasskey()`                         | ✅ `auth.mfa.enroll({ factorType: 'passkey' })` oder `auth.registerPasskey()` (experimental) | ⚠️ Prüfen |
| `signInWithPasskey()` | `auth.signInWithPasskey()`                       | ✅ `auth.signInWithPasskey()` (experimental)                                                 | ⚠️ Prüfen |
| `listPasskeys()`      | `auth.passkey.list()`                            | ❌ **Nicht existent** – korrekt: `auth.mfa.listFactors()` filtert passkeys                   | 🔴        |
| `updatePasskey()`     | `auth.passkey.update({passkeyId, friendlyName})` | ❌ **Nicht existent** – MFA factors haben kein Update für friendlyName                       | 🔴        |
| `deletePasskey()`     | `auth.passkey.delete({passkeyId})`               | ❌ **Nicht existent** – korrekt: `auth.mfa.unenroll({ factorId })`                           | 🔴        |

### Typ-Definitionen (aus `node_modules/@supabase/supabase-js/dist`)

```typescript
// Was v2.116.0 tatsächlich expose:
auth.mfa.enroll({ factorType: 'passkey', friendlyName?: string })
auth.mfa.listFactors() → { factors: MFAFactor[] }
auth.mfa.unenroll({ factorId: string })
auth.signInWithPasskey() // experimental
// KEIN auth.passkey.* Namespace!
```

### Zusätzliche Probleme

| #   | Problem                                                                                             |
| --- | --------------------------------------------------------------------------------------------------- |
| 1   | `registerPasskey()` – gibt was zurück? `data` Typ unklar, keine Fehlerbehandlung für User-Cancel    |
| 2   | Native Passkeys: Kommentar Zeile 35-38 bestätigt PoC-Status, aber API nutzt Web-spezifische Methods |
| 3   | Keine `domains` / `rpId` Konfiguration für WebAuthn                                                 |

### Bewertung: 🔴 **Passkeys – API-Inkompatibilitäten, Native PoC**

---

## 4. Biometrie – `packages/native/src/auth/biometry.ts`

### Code-Review

```typescript
export async function authenticateWithBiometryForPasskey(): Promise<{
  success: boolean;
  error?: string;
}> {
  // This will be used for Passkey ceremony on native
  // Requires react-native-webauthn or expo-web-authn
  // Implementation pending PoC
  return { success: false, error: 'Native Passkey not yet implemented - PoC required' };
}
```

### Architektur-Prüfung

| Aspekt                                                                | Implementierung                                                                          | Konformität |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------- |
| Face ID / Touch ID / Fingerprint als **lokaler Entsperr-Mechanismus** | ✅ `authenticateWithBiometry()` nutzt `expo-local-authentication` nur für lokalen Prompt | 🟢          |
| Biometrie als **eigener Supabase-Auth-Factor**                        | ❌ Nicht implementiert (korrekt so!)                                                     | 🟢          |
| Trennung: Supabase Auth vs. Local Biometry                            | ✅ Klare Trennung im Code & Kommentaren                                                  | 🟢          |
| SecureStore für Session-Secrets                                       | ✅ `packages/native/src/storage/secure-store.ts` vorhanden                               | 🟢          |

### Bewertung: 🟢 **Biometrie – Architektur korrekt getrennt, Native Passkey PoC offen**

---

## 5. Supabase-Migrationen – Klassifikation

### Übersicht aller 10 Migrationen (nicht 18!)

| #   | Datei                 | Typ                  | Status             |
| --- | --------------------- | -------------------- | ------------------ |
| 000 | `extensions.sql`      | **Scaffold/Helper**  | ✅ Fertig          |
| 001 | `profiles.sql`        | **Schema + RLS**     | 🟡 Probleme        |
| 002 | `pets.sql`            | **Schema + RLS**     | 🟢 OK              |
| 003 | `bookings.sql`        | **Schema + RLS**     | 🔴 Kritisch        |
| 004 | `tracking.sql`        | **Schema + RLS**     | 🟡 Unvollständig   |
| 010 | `timebank.sql`        | **Schema + RPC**     | 🔴 Race Condition  |
| 014 | `storage_buckets.sql` | **Storage Policies** | 🟡 Bucket-Struktur |
| 015 | `realtime.sql`        | **Realtime Config**  | 🟡 Konzept         |
| 016 | `functions.sql`       | **RPCs/Functions**   | 🟢 OK              |
| 017 | `indexes.sql`         | **Performance**      | 🟢 OK              |

**Hinweis:** Migrationen 005-009 und 011-013 **existieren nicht** (Lücken in der Nummerierung). Die Aussage "18 Migrationen" war falsch.

---

### 5.1 Profiles – `001_profiles.sql`

#### Probleme

| #   | Policy                                               | Problem                                                                                                                                                                                                                 | Korrektur                                                                                      |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | `"Public profile basic info"` (L48-49)               | `FOR SELECT USING (id = auth.uid() OR trust_level != 'basic')` – **ganze Zeile öffentlich** für trust_level != 'basic'. Enthält: `email`, `phone`, `location`, `notification_prefs`, `timezone`, `onboarding_completed` | 🔴 **Public Profile View** nötig, nur `id, display_name, avatar_url, trust_level, role` public |
| 2   | `"Admin full access profiles"` (L67-70)              | `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')` – **RLS-Rekursion** (fragt profiles aus profiles ab)                                                                                   | 🔴 `SECURITY DEFINER` Function `is_admin()` nötig                                              |
| 3   | `current_user_location()` (000_extensions.sql:19-22) | Nutzt `profiles` Tabelle direkt – rekursiv bei Admin-Policy                                                                                                                                                             | 🔴                                                                                             |

#### Fehlende Trennung

- Keine `public_profiles` View
- Keine Column-Level-Security (PostgreSQL hat keine, nur via View)

---

### 5.2 Bookings – `003_bookings.sql`

#### UPDATE-Policies – Kritische Lücken

| Policy                  | USING                                                                       | WITH CHECK                                                                      | Problem                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Helper accept/reject`  | `helper_id = auth.uid() AND status = 'requested'`                           | `helper_id = auth.uid() AND status IN ('confirmed', 'cancelled')`               | Helper kann **alle Spalten** ändern: `pet_id`, `seeker_id`, `price_eur_cents`, `start_at`, `end_at`, `meeting_location`, etc. |
| `Seeker cancel`         | `seeker_id = auth.uid() AND status IN ('requested', 'confirmed')`           | `seeker_id = auth.uid() AND status = 'cancelled' AND cancelled_by = auth.uid()` | Seeker kann `helper_id`, `price`, `pet_id` ändern                                                                             |
| `Helper start/complete` | `helper_id = auth.uid() AND status IN ('confirmed', 'in_progress')`         | `helper_id = auth.uid() AND status IN ('in_progress', 'completed')`             | Helper kann `seeker_id`, `pet_id`, `price`, `meeting_location` ändern                                                         |
| `Seeker rate helper`    | `seeker_id = auth.uid() AND status = 'completed' AND rating_helper IS NULL` | `seeker_id = auth.uid() AND rating_helper BETWEEN 1 AND 5`                      | **OK** – nur rating_helper                                                                                                    |
| `Helper rate seeker`    | `helper_id = auth.uid() AND status = 'completed' AND rating_seeker IS NULL` | `helper_id = auth.uid() AND rating_seeker BETWEEN 1 AND 5`                      | **OK** – nur rating_seeker                                                                                                    |

#### Fehlende Mechanismen

- ❌ Keine RPCs für Status-Transitions (`accept_booking`, `start_booking`, `complete_booking`)
- ❌ Keine Column-Level-Restriktionen via Trigger
- ❌ `Admin manage bookings` nutzt wieder rekursive `profiles` Abfrage

---

### 5.3 Tracking – `004_tracking.sql`

| Aspekt                     | Status                                                   |
| -------------------------- | -------------------------------------------------------- |
| `tracking_sessions` RLS    | 🟢 Teilnehmer lesen, Helper managt                       |
| `tracking_points` RLS      | 🟢 Teilnehmer lesen, Helper insert nur bei `in_progress` |
| `tracking_points` Realtime | ❌ Nicht in Publication (siehe 015) – **gut so**         |
| Offline-Puffer / Retry     | ❌ Nur in Memory (siehe Tracking Service)                |

---

### 5.4 Admin-RLS Rekursion – Systematisch

**Betroffene Policies:**

- `001_profiles.sql:67-70` – Admin full access
- `003_bookings.sql:81-82` – Admin manage bookings
- `014_storage_buckets.sql:86-87` – Verification read by admin

**Alle nutzen:** `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`

**Lösung:** `SECURITY DEFINER` Function:

```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

### 5.5 Timebank – `010_timebank.sql`

#### Race Condition in `timebank_adjust()`

```sql
IF NOT FOUND THEN
  INSERT INTO timebank_accounts (user_id, balance_hours)
  VALUES (p_user_id, 0)
  ON CONFLICT DO NOTHING
  RETURNING balance_hours INTO v_balance_before;  -- ❌ NULL bei Konflikt!
END IF;
```

**Problem:** Bei Race (zwei parallele Calls):

1. Call A: `SELECT ... FOR UPDATE` → NOT FOUND
2. Call B: `SELECT ... FOR UPDATE` → NOT FOUND (A noch nicht committed)
3. Call A: `INSERT ... ON CONFLICT DO NOTHING` → succeeds, `v_balance_before = 0`
4. Call B: `INSERT ... ON CONFLICT DO NOTHING` → **konfliktiert**, `RETURNING` liefert **NULL**
5. Call B: `v_balance_after := NULL + amount` → **NULL** → Exception oder falscher Balance

#### Weitere Probleme

| #   | Problem                                                                                         |
| --- | ----------------------------------------------------------------------------------------------- |
| 1   | Kein `SET search_path = public` in Function                                                     |
| 2   | `EXECUTE` Berechtigung nicht explizit gegrantet                                                 |
| 3   | `created_by = auth.uid()` – bei RPC Call via Service Role könnte `auth.uid()` NULL sein         |
| 4   | Keine Idempotenz-Key (z. B. `reference_type + reference_id` unique) gegen Edge Function Retries |

---

### 5.6 Storage – `014_storage_buckets.sql`

#### Bucket-Struktur

| Bucket              | Public       | Zweck                                     | Bewertung                                          |
| ------------------- | ------------ | ----------------------------------------- | -------------------------------------------------- |
| `avatars`           | ✅ true      | Öffentliche Avatare                       | 🟢 OK                                              |
| `pet-photos`        | ❌ false     | Privat, booking-basiert                   | 🟢 OK                                              |
| `hazard-photos`     | ❌ **false** | Draft privat, published public via Policy | 🟢 **Variante B (Private + Signed URLs / Policy)** |
| `verification-docs` | ❌ false     | Streng privat                             | 🟢 OK                                              |

**Wichtig:** `hazard-photos` ist **NICHT public** (Zeile 51: `false`). Policy `"Hazard photo read active"` (L60-70) filtert über `hazards.status = 'active'`. Das ist **Variante B (ein Private Bucket mit Policy)** – **korrekt**.

#### Policy-Probleme

| Policy                              | Problem                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `Avatar upload by owner` (L11-15)   | `auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())` – **tautologisch**, immer true |
| `Pet photo upload` (L31-35)         | `storage.foldername(name))[1]::uuid` – fragiles Pfad-Parsing, kein FK-Check                   |
| `Hazard photo read active` (L60-70) | Nutzt `current_user_location()` → rekursiv via profiles                                       |

---

### 5.7 Realtime – `015_realtime.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tracking_sessions;
-- tracking_points NICHT hinzugefügt – KORREKT
```

#### `tracking_live_position()` Function (L17-38)

- Gibt **neueste Position pro Session** zurück (DISTINCT ON)
- Filter: `received_at > NOW() - INTERVAL '5 minutes'`
- **Aber:** Realtime auf Views **nicht direkt unterstützt** (Kommentar L40-41)

#### Architektur-Entscheidung

| Ansatz                                 | Status                                            |
| -------------------------------------- | ------------------------------------------------- |
| Postgres Changes auf `tracking_points` | ❌ Nicht aktiviert (gut)                          |
| View `tracking_live_position`          | ✅ Vorhanden, aber nicht via Realtime abonnierbar |
| Broadcast / Throttled Channel          | ❌ Nicht implementiert (TODO)                     |

**Empfehlung:** Supabase **Broadcast** Channel für Live-Position (client-seitig throttled, z. B. 1 Hz), persistierte Punkte nur via `tracking_points` INSERT.

---

## 6. Tracking Background Task – `packages/native/src/tracking/tracking-service.ts`

### Kritischer Fehler: `TaskManager.defineTask` in Instanzmethode

```typescript
async startBackground(): Promise<void> {
  // ...
  if (!TaskManager.isTaskDefined(TRACKING_TASK)) {
    TaskManager.defineTask<LocationTrackingTaskData>(TRACKING_TASK, async ({ data, error }) => {
      // ...
      await this.handleBackgroundLocations(data.locations);  // ❌ THIS KONTEXT VERLOREN!
    });
  }
  // ...
}
```

**Warum das scheitert:**

1. `TaskManager.defineTask` **muss auf Modulebene** (Top-Level) stehen
2. Background Task läuft in **separatem JS-Kontext** ohne Instanz-Referenz
3. `this.handleBackgroundLocations` existiert im Background-Kontext **nicht**
4. In-Memory `this.buffer` **nicht verfügbar** nach App-Neustart / Background-Restart

### Weitere Lücken

| Feature                                              | Status     | Details                                                                   |
| ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| Task auf Modulebene definiert                        | ❌         | In Klassenmethode                                                         |
| Session-ID persistent gespeichert                    | ❌         | Nur in Memory                                                             |
| Offline-Puffer persistent (AsyncStorage/MMNV/SQLite) | ❌         | Nur `this.buffer` Array                                                   |
| Batch-Versand retry-fähig                            | ❌         | `catch { this.buffer.unshift(...batch) }` – verliert bei Crash            |
| Stop/Restart funktioniert                            | ❌         | Kein Persist-State für Resume                                             |
| iOS `UIBackgroundModes` location                     | ❌         | Kein `app.config.js` / `expo.plist` Eintrag                               |
| Android Foreground Service                           | ⚠️ Partial | `foregroundService` Config vorhanden, aber keine Permission/Channel Setup |
| `expo-task-manager` in dependencies                  | ✅         | v57.0.19                                                                  |

### Bewertung: 🔴 **Tracking Background Task – Nicht funktionsfähig, PoC-Status**

---

## 7. Realtime – Zusammenfassung

Siehe 5.7. Architektur unterscheidet **nicht sauber** zwischen:

- Persistierte GPS-Punkte (`tracking_points` Tabelle) ✅
- Live-Location-Übertragung ❌ (nur Function, kein Channel)
- Supabase Realtime (Postgres Changes) ❌ (nicht für high-freq)
- Broadcast ❌ (nicht implementiert)

---

## 8. Storage – Zusammenfassung

Siehe 5.6. **Variante B** (Private Bucket + Policy) für `hazard-photos` **korrekt umgesetzt**. Kein Public Bucket mit privaten Drafts.

**Kleinere Policy-Bugs** (tautologische Checks, fragiles Path-Parsing, rekursive Admin-Prüfung).

---

## 9. Timebank – Zusammenfassung

Siehe 5.5. **Race Condition** im `timebank_adjust()` durch `ON CONFLICT DO NOTHING RETURNING` Problem. Fehlende Idempotenz, fehlende `search_path`, fehlende Grants.

---

## 10. Generated Types – `packages/supabase/src/types/database.ts`

### Status

```typescript
// Zeile 2-3:
// Generated from Supabase schema - run `pnpm gen:types` after local dev setup
// This is a placeholder - actual types will be generated from Supabase CLI
```

**Das ist ein manuell geschriebener Placeholder**, **keine** generierten Types.

### Korrekter Generierungs-Befehl (aus package.json)

```bash
pnpm gen:types
# → supabase gen types typescript --local > src/types/database.ts
```

**Voraussetzung:** Lokales Supabase läuft (`supabase start`), Migrationen applied (`supabase db reset`).

### Bewertung: 🟡 **Placeholder – OK für Dev, aber nicht als "generiert" bezeichnen**

---

## 11. Ergebnis-Tabelle

| Bereich             | Status | Befund                                                                                                                   |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Monorepo**        | 🟢     | Turborepo Setup, Workspaces, Scripts konsistent                                                                          |
| **Expo**            | 🟢     | SDK 57, alle Core-Packages aligned, `expo-doctor` clean, `react-native-maps` fehlt                                       |
| **Supabase Client** | 🔴     | **Einheitlich `window.localStorage`** – bricht Native/SSR; Env-Check bricht Build; keine Plattform-Trennung              |
| **Passkeys Web**    | 🔴     | API-Aufrufe (`auth.passkey.*`) **existieren nicht** in v2.116.0 Types; korrekt: `auth.mfa.*`                             |
| **Passkeys Native** | 🔴     | PoC-Status bestätigt, keine Implementierung, Web-API nicht übertragbar                                                   |
| **Biometrie**       | 🟢     | Sauber getrennt: Local Auth nur für Unlock, nicht als Supabase Factor                                                    |
| **Profiles/RLS**    | 🔴     | **Public Policy leakt sensible Spalten** (email, location, prefs); **Admin-Rekursion** via `profiles` Self-Join          |
| **Bookings/RLS**    | 🔴     | **UPDATE-Policies erlauben Spalten-Manipulation** (price, pet_id, dates) statt nur Status; Admin-Rekursion               |
| **Tracking**        | 🟡     | Schema/RLS OK; Background Task **nicht funktionsfähig** (Module-Level Task fehlt, keine Persistenz)                      |
| **Realtime**        | 🟡     | `tracking_points` korrekt **nicht** in Publication; Live-Position nur via Function (nicht subscribable); Broadcast fehlt |
| **Storage**         | 🟡     | Bucket-Struktur korrekt (Variante B); Policy-Bugs (tautologisch, Path-Parsing, Rekursion)                                |
| **Timebank**        | 🔴     | **Race Condition** in `timebank_adjust()` (NULL balance bei Konflikt); keine Idempotenz, keine Grants                    |
| **Generated Types** | 🟡     | Placeholder only, nicht generiert; Befehl dokumentiert                                                                   |

---

## Detaillierte 🔴/🟡 Korrektur-Liste

### 🔴 Kritisch (Blocker für Phase 3)

| Bereich         | Datei                                              | Zeile | Problem                                                             | Korrektur                                                                                                                                             |
| --------------- | -------------------------------------------------- | ----- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Client | `packages/supabase/src/client/createClient.ts`     | 27    | `storage: window.localStorage` für alle Plattformen                 | Plattform-spezifischer Storage Adapter (Web: localStorage, Native: ExpoSecureStore/MMNV, SSR: none)                                                   |
| Supabase Client | `packages/supabase/src/client/createClient.ts`     | 6-11  | Throw bei fehlenden Env-Vars bricht SSR/Build                       | Lazy Init / Optional Client / Build-time Check                                                                                                        |
| Passkeys        | `packages/supabase/src/auth/passkeys.ts`           | 20    | `auth.passkey.list()` nicht existent                                | `auth.mfa.listFactors()` + Filter `factorType === 'passkey'`                                                                                          |
| Passkeys        | `packages/supabase/src/auth/passkeys.ts`           | 26    | `auth.passkey.update()` nicht existent                              | Nicht unterstützt – nur `unenroll` + neu `enroll`                                                                                                     |
| Passkeys        | `packages/supabase/src/auth/passkeys.ts`           | 31    | `auth.passkey.delete()` nicht existent                              | `auth.mfa.unenroll({ factorId: credentialId })`                                                                                                       |
| Profiles RLS    | `supabase/migrations/001_profiles.sql`             | 48-49 | Public Policy leakt `email`, `phone`, `location`, `prefs`           | `CREATE VIEW public_profiles AS SELECT id, display_name, avatar_url, trust_level, role FROM profiles WHERE trust_level != 'basic';` + Policy auf View |
| Profiles RLS    | `supabase/migrations/001_profiles.sql`             | 67-70 | Admin-Rekursion (profiles fragt profiles)                           | `SECURITY DEFINER FUNCTION is_admin()`                                                                                                                |
| Bookings RLS    | `supabase/migrations/003_bookings.sql`             | 61-79 | UPDATE-Policies ohne Spalten-Restriktion                            | RPCs für jede Transition (`accept_booking`, `cancel_booking`, `start_booking`, `complete_booking`, `rate_booking`)                                    |
| Bookings RLS    | `supabase/migrations/003_bookings.sql`             | 81-82 | Admin-Rekursion                                                     | `is_admin()` Function                                                                                                                                 |
| Timebank        | `supabase/migrations/010_timebank.sql`             | 65-69 | Race: `ON CONFLICT DO NOTHING RETURNING` → NULL                     | `INSERT ... ON CONFLICT DO NOTHING; THEN SELECT ... FOR UPDATE` in zwei Steps                                                                         |
| Timebank        | `supabase/migrations/010_timebank.sql`             | 46    | Kein `SET search_path`, keine Grants                                | `SECURITY DEFINER SET search_path = public; GRANT EXECUTE ON FUNCTION timebank_adjust TO authenticated;`                                              |
| Tracking BG     | `packages/native/src/tracking/tracking-service.ts` | 78-84 | `TaskManager.defineTask` in Instanzmethode, `this` Kontext verloren | Task **Modulebene** definieren; State in **AsyncStorage/SQLite** persistieren; Session-ID speichern                                                   |

### 🟡 Warnung (Vor Phase 3 beheben)

| Bereich         | Datei                                              | Zeile   | Problem                                | Korrektur                                                    |
| --------------- | -------------------------------------------------- | ------- | -------------------------------------- | ------------------------------------------------------------ |
| Storage         | `supabase/migrations/014_storage_buckets.sql`      | 11-15   | Avatar upload Policy tautologisch      | `auth.uid() = owner` (Storage setzt `owner` automatisch)     |
| Storage         | `supabase/migrations/014_storage_buckets.sql`      | 34      | Pet photo Path-Parsing fragil          | Ordner-Struktur `ownerId/petId/...` + FK-Check via Join      |
| Storage         | `supabase/migrations/014_storage_buckets.sql`      | 68      | `current_user_location()` rekursiv     | `SECURITY DEFINER` Function oder Client-seitige Location     |
| Realtime        | `supabase/migrations/015_realtime.sql`             | 17-41   | View nicht via Realtime abonnierbar    | Broadcast Channel für Live-Position implementieren           |
| Tracking        | `packages/native/src/tracking/tracking-service.ts` | 123-127 | Background Handler nur `console.log`   | Persistenz (SQLite/AsyncStorage) + Sync-Queue + Retry        |
| Tracking        | `app.json`                                         | —       | iOS `UIBackgroundModes` location fehlt | `expo-location` Plugin Config mit `locationBackground: true` |
| Generated Types | `packages/supabase/src/types/database.ts`          | 1-3     | Placeholder, nicht generiert           | `supabase db reset` → `pnpm gen:types` in CI/CD              |
| Passkeys Native | `packages/native/src/auth/biometry.ts`             | 53-58   | PoC-Status, keine Implementierung      | `react-native-webauthn` oder `expo-web-authn` evaluieren     |

---

## Nächste Schritte (Entscheidung vor Phase 3)

1. **Supabase Client** plattform-spezifisch machen (Prio 1)
2. **Passkeys API** auf `auth.mfa.*` migrieren (Prio 1)
3. **Profiles RLS**: Public View + `is_admin()` Function (Prio 1)
4. **Bookings RLS**: RPCs für Status-Transitions (Prio 1)
5. **Timebank**: Race Condition fixen, Grants setzen (Prio 1)
6. **Tracking Background**: Module-Level Task + Persistenz (Prio 1)
7. **Storage Policies**: Tautologien & Rekursion bereinigen (Prio 2)
8. **Realtime**: Broadcast Channel für Live-Position (Prio 2)
9. **Generated Types**: CI-Pipeline für `supabase gen types` (Prio 2)
10. **react-native-maps** installieren (Prio 3)

---

**Ende des Audits. Keine Code-Änderungen durchgeführt.**
