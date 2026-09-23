# Technische Abnahme PfotenNetz – Pre-Phase 3 Audit V2 (Nach Korrekturen)

**Datum:** 2026-09-20  
**Status:** Korrekturen implementiert, Typecheck & Expo Doctor erfolgreich  
**Baseline:** AUDIT_REPORT.md (Initial-Audit)

---

## Zusammenfassung der durchgeführten Korrekturen

| Bereich             | Vorher                                                                | Nachher                                                                            | Status                  |
| ------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| **Supabase Client** | 🔴 `window.localStorage` für alle Plattformen                         | 🟢 Plattform-spezifisch (Web: localStorage, Native: SecureStore+Memory, SSR: none) | ✅ Behoben              |
| **Passkeys Web**    | 🔴 (Audit-Fehler: API existierte nicht)                               | 🟢 API **existiert** in v2.116.0 – Code war bereits korrekt                        | ✅ Keine Änderung nötig |
| **Passkeys Native** | 🔴 PoC-Status                                                         | 🟡 PoC-Status (unverändert, dokumentiert)                                          | 🟡 Offen                |
| **Biometrie**       | 🟢 Sauber getrennt                                                    | 🟢 Unverändert                                                                     | ✅ OK                   |
| **Profiles/RLS**    | 🔴 Public Policy leakt private Felder; Admin-Rekursion                | 🟢 `public_profiles` View + `is_admin()` SECURITY DEFINER                          | ✅ Behoben              |
| **Bookings/RLS**    | 🔴 UPDATE-Policies erlauben beliebige Spalten-Änderung                | 🟢 RPCs für jede State-Transition, keine direkten UPDATE-Policies                  | ✅ Behoben              |
| **Tracking**        | 🟡 Background Task defekt (`TaskManager.defineTask` in Instanz)       | 🟢 Module-Level Task + Persistenz (SecureStore) + Resume/Flush                     | ✅ Behoben              |
| **Storage**         | 🟡 Tautologische Policies, fragiles Path-Parsing                      | 🟢 Korrigierte Policies, `is_admin()` statt Rekursion                              | ✅ Behoben              |
| **Timebank**        | 🔴 Race Condition (`ON CONFLICT DO NOTHING RETURNING` → NULL)         | 🟢 Two-Step INSERT + SELECT FOR UPDATE + Idempotenz-Key                            | ✅ Behoben              |
| **Realtime**        | 🟡 `tracking_points` nicht in Publication; Live-Position nur Function | 🟡 Unverändert (Architektur-Entscheidung: Broadcast für Live)                      | 🟡 Offen                |
| **Generated Types** | 🟡 Placeholder                                                        | 🟡 Placeholder (unverändert)                                                       | 🟡 Offen                |

---

## Detaillierte Änderungen

### 1. Supabase Client – `packages/supabase/src/client/createClient.ts`

**Probleme behoben:**

- ❌ `storage: typeof window !== 'undefined' ? window.localStorage : undefined` – brach auf Native/SSR
- ❌ Env-Check beim Import → Build-Abbruch bei SSR

**Lösung:**

```typescript
function createStorageAdapter(): SupportedStorage | undefined {
  // Browser → window.localStorage
  // Native (Expo) → expo-secure-store + Memory-Cache (sync-compatible)
  // SSR → undefined (keine Persistenz)
}
```

- Runtime-Validierung der Env-Vars (nicht Import-Zeit)
- `isBrowser()` Helper für sichere Plattform-Erkennung
- Dynamic `require('expo-secure-store')` vermeidet Web-Bundle-Probleme

**TypeScript:** `"lib": ["ES2022", "DOM"]` in `tsconfig.json` für `window`/`localStorage` Types

---

### 2. Passkeys – Verifikation der installierten API

**Ergebnis:** `@supabase/supabase-js@2.116.0` **hat** die Passkey-API:

| Methode                                                         | Existenz | Signatur                                                 |
| --------------------------------------------------------------- | -------- | -------------------------------------------------------- |
| `auth.registerPasskey(credentials?)`                            | ✅       | `Promise<AuthPasskeyRegistrationVerifyResponse>`         |
| `auth.signInWithPasskey(credentials?)`                          | ✅       | `Promise<AuthPasskeyAuthenticationVerifyResponse>`       |
| `auth.passkey.list()`                                           | ✅       | `Promise<AuthPasskeyListResponse>` (`PasskeyListItem[]`) |
| `auth.passkey.update({passkeyId, friendlyName})`                | ✅       | `Promise<AuthPasskeyUpdateResponse>`                     |
| `auth.passkey.delete({passkeyId})`                              | ✅       | `Promise<AuthPasskeyDeleteResponse>`                     |
| `auth.passkey.startRegistration()` / `verifyRegistration()`     | ✅       | Two-Step Registration                                    |
| `auth.passkey.startAuthentication()` / `verifyAuthentication()` | ✅       | Two-Step Authentication                                  |

**Aktueller Code in `packages/supabase/src/auth/passkeys.ts` ist korrekt für v2.116.0.**  
Keine Migration auf `auth.mfa.*` nötig.

**Native Passkeys:** Bleiben PoC (Benötigt `react-native-webauthn` / `expo-web-authn` + Development Build).

---

### 3. Profiles/RLS – `supabase/migrations/001_profiles.sql` + `000_extensions.sql`

**Neu in 000_extensions.sql:**

```sql
-- SECURITY DEFINER Function – vermeidet RLS-Rekursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
```

**Neu in 001_profiles.sql:**

```sql
-- Public View NUR für bewusst veröffentlichte Felder
CREATE VIEW public_profiles AS
SELECT id, display_name, avatar_url, trust_level, role, created_at
FROM profiles
WHERE trust_level != 'basic';

GRANT SELECT ON public_profiles TO authenticated, anon;

-- Admin Policy nutzt is_admin() statt Self-Join
CREATE POLICY "Admin full access profiles" ON profiles
  FOR ALL USING (is_admin());
```

**Private Felder (email, phone, location, notification_prefs, timezone, onboarding_completed) sind NIEMALS über `public_profiles` lesbar.**

---

### 4. Bookings/RLS – `supabase/migrations/003_bookings.sql`

**Entfernt:** Alle direkten `UPDATE`-Policies für Teilnehmer  
**Hinzugefügt:** RPC-Funktionen für kontrollierte State-Transitions:

| RPC                                               | Berechtigung | Validierung                               | Erlaubte Änderungen                                                 |
| ------------------------------------------------- | ------------ | ----------------------------------------- | ------------------------------------------------------------------- |
| `helper_accept_booking(booking_id)`               | Helper       | status='requested'                        | status→'confirmed'                                                  |
| `helper_reject_booking(booking_id, reason?)`      | Helper       | status='requested'                        | status→'cancelled', cancelled_by, cancelled_at, cancellation_reason |
| `seeker_cancel_booking(booking_id, reason?)`      | Seeker       | status∈('requested','confirmed')          | status→'cancelled', cancelled_by, cancelled_at, cancellation_reason |
| `helper_start_booking(booking_id)`                | Helper       | status='confirmed'                        | status→'in_progress'                                                |
| `helper_complete_booking(booking_id)`             | Helper       | status='in_progress'                      | status→'completed'                                                  |
| `seeker_rate_helper(booking_id, rating, review?)` | Seeker       | status='completed', rating_helper IS NULL | rating_helper, review_helper                                        |
| `helper_rate_seeker(booking_id, rating, review?)` | Helper       | status='completed', rating_seeker IS NULL | rating_seeker, review_seeker                                        |

**Alle RPCs:**

- `SECURITY DEFINER` mit `SET search_path = public`
- `SELECT ... FOR UPDATE` für Race-Condition-Schutz
- `GRANT EXECUTE ... TO authenticated`

**Admin-Zugriff:** Über `is_admin()` Function

---

### 5. Timebank – `supabase/migrations/010_timebank.sql`

**Race Condition behoben:**

```sql
-- VORHER (fehlerhaft):
INSERT ... ON CONFLICT DO NOTHING RETURNING balance_hours INTO v_balance_before;
-- → NULL bei Conflict (parallel INSERT)

-- NACHHER (korrekt):
INSERT INTO timebank_accounts (user_id, balance_hours)
VALUES (p_user_id, 0)
ON CONFLICT (user_id) DO NOTHING;  -- Step 1: Ensure row exists

SELECT balance_hours INTO v_balance_before
FROM timebank_accounts
WHERE user_id = p_user_id
FOR UPDATE;  -- Step 2: Lock & read (garantiert vorhanden)

-- Dann: balance_after berechnen, UPDATE, INSERT transaction
```

**Idempotenz:** Unique Constraint auf `(reference_type, reference_id)` in `timebank_transactions` verhindert doppelte Buchungen bei Edge-Function-Retries.

**Ledger:** Keine INSERT/UPDATE/DELETE Policies für Clients – nur RPC `timebank_adjust()`.

---

### 6. Tracking Background Task – `packages/native/src/tracking/tracking-service.ts`

**Kritischer Fix:** `TaskManager.defineTask()` auf **Modulebene** (nicht in Klassenmethode):

```typescript
// MODULE LEVEL – REQUIRED for background execution
TaskManager.defineTask<LocationTrackingTaskData>(TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Tracking task error:', error);
    return;
  }
  if (data?.locations) {
    await handleBackgroundLocations(data.locations); // Standalone function
  }
});
```

**Persistenz via `expo-secure-store`:**

- `ACTIVE_SESSION_ID` – überlebt App-Neustart
- `SESSION_STATE` – 'foreground' | 'background' | 'idle'
- `PENDING_POINTS` – Offline-Queue (max 1000 Punkte)

**Neue Methoden:**

- `resumeIfNeeded()` – prüft beim App-Start auf laufendes Background-Tracking
- `flushPendingPoints(onBatchSend)` – sendet Offline-Queue beim nächsten Online

**iOS/Android:** Background Modes / Foreground Service Config in `app.json` noch PoC (nicht in Code validiert).

---

### 7. Storage – `supabase/migrations/014_storage_buckets.sql`

**Korrigierte Policies:**

| Bucket              | Problem                                                                     | Fix                                                                                   |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `avatars`           | `auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid())` tautologisch | `auth.uid() = owner` (Storage setzt `owner` automatisch)                              |
| `pet-photos`        | Path-Parsing `[1]::uuid` für owner, aber Pet-ID war `[2]`                   | Explizit: `[1]=owner_id`, `[2]=pet_id`                                                |
| `hazard-photos`     | `current_user_location()` rekursiv                                          | Policy für "active hazards" nutzt `current_user_location()` (SECURITY DEFINER in 000) |
| `verification-docs` | Admin-Check rekursiv via profiles                                           | `is_admin()` Function                                                                 |

**Architektur:** `hazard-photos` bleibt **PRIVATE Bucket** (Variante B).  
Veröffentlichte Fotos werden via **Signed URLs** oder kontrollierte Policy (`h.status='active'`) ausgeliefert.  
**Kein PUBLIC Bucket für private Drafts.**

---

### 8. Realtime – `supabase/migrations/015_realtime.sql`

**Unverändert (Architektur-Entscheidung):**

- `tracking_points` **nicht** in `supabase_realtime` Publication
- `tracking_live_position()` Function für "latest position per session"
- **Broadcast Channel** für Live-Position (Client-seitig throttled, z.B. 1 Hz) ist Implementierungs-Aufgabe der App, nicht DB-Migration

---

### 9. Generated Types – `packages/supabase/src/types/database.ts`

**Status:** Weiterhin manueller Placeholder  
**Workflow für echte Types (später):**

```bash
# 1. Lokalen Supabase starten
supabase start

# 2. Migrationen anwenden
supabase db reset

# 3. Types generieren
pnpm --filter @pfotennetz/supabase gen:types
# → supabase gen types typescript --local > src/types/database.ts
```

**CI/CD:** In Pipeline nach `supabase db reset` ausführen.

---

## Validierung

| Check                              | Ergebnis                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` (alle 5 Packages) | ✅ **0 Errors**                                                                                                                              |
| `npx expo-doctor`                  | ✅ **21/21 Checks passed**                                                                                                                   |
| `pnpm lint`                        | ⚠️ **Pre-existing ESLint Config Issue** (TypeScript ESLint benötigt `project` Option für typed-linting) – nicht durch Korrekturen verursacht |

---

## Offene Punkte (🟡) für Phase 3

| Bereich                    | Punkt                                                                                        | Empfehlung                       |
| -------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| **Passkeys Native**        | `react-native-webauthn` / `expo-web-authn` Evaluation + Development Build Test               | PoC auf echtem Gerät vor Phase 3 |
| **Tracking iOS/Android**   | `UIBackgroundModes` (location) in `app.json` + Android Foreground Service Permission/Channel | Auf Gerät testen                 |
| **Realtime Live-Location** | Broadcast Channel Implementation in App (nicht DB)                                           | Vor Phase 3 in App-Code umsetzen |
| **Generated Types**        | CI-Pipeline für `supabase gen types`                                                         | Vor Production Deploy            |
| **ESLint Config**          | TypeScript ESLint `projectService: true` oder `project` Pfade konfigurieren                  | Technische Schuld, nicht blocker |

---

## Entscheidung

**Phase 3 kann freigegeben werden** für:

- Datenbank-Schema & RPCs (Profiles, Bookings, Timebank, Tracking, Storage)
- Supabase Client mit plattform-spezifischem Storage
- Passkeys Web (API verifiziert)
- Native Biometrie

**Vor Phase 3 Start empfohlen:**

1. ESLint Config reparieren (TypeScript ESLint project config)
2. Native Passkey PoC auf Gerät testen
3. Background Tracking auf iOS/Android Gerät validieren
4. Broadcast Channel für Live-Location in App implementieren

---

**Ende des V2-Audits.**
