# Phase 3 Remote Audit – Migrationsanalyse

**Datum:** 2026-09-20  
**Remote-Projekt:** `njkyujhbcolvtcnlahsk` (PfotenNetz, ACTIVE_HEALTHY, eu-west-1)  
**Status:** Verknüpft, keine Remote-Migrationen, 3 leere Tabellen

---

## 1. Lokale Migrationen 000–017 – Übersicht

**Vorhandene Dateien (10 von 18):**

| #       | Datei                     | Status            |
| ------- | ------------------------- | ----------------- |
| 000     | `000_extensions.sql`      | ✅ Vorhanden      |
| 001     | `001_profiles.sql`        | ✅ Vorhanden      |
| 002     | `002_pets.sql`            | ✅ Vorhanden      |
| 003     | `003_bookings.sql`        | ✅ Vorhanden      |
| 004     | `004_tracking.sql`        | ✅ Vorhanden      |
| 005–009 | **FEHLEND**               | ❌ Nicht existent |
| 010     | `010_timebank.sql`        | ✅ Vorhanden      |
| 011–013 | **FEHLEND**               | ❌ Nicht existent |
| 014     | `014_storage_buckets.sql` | ✅ Vorhanden      |
| 015     | `015_realtime.sql`        | ✅ Vorhanden      |
| 016     | `016_functions.sql`       | ✅ Vorhanden      |
| 017     | `017_indexes.sql`         | ✅ Vorhanden      |

**Fehlende Migrationen (vermutlich für):**

- 005: `messages.sql`
- 006: `hazards.sql`
- 007: `hazard_sightings.sql`
- 008: `missing_pets.sql`
- 009: `community_events.sql` + `event_participants.sql`
- 011: `verifications.sql`
- 012: `helper_availabilities.sql`
- 013: `notifications.sql` + `devices.sql`

---

## 2. Detaillierte Objekt-Analyse pro Migration

### 000_extensions.sql

- **Extensions:** `postgis`, `uuid-ossp`, `pgcrypto` (alle `IF NOT EXISTS` ✅)
- **Functions:** `update_updated_at_column()` (SECURITY DEFINER), `current_user_location()` (SECURITY DEFINER), `is_admin()` (SECURITY DEFINER)
- **Grants:** `EXECUTE` auf `is_admin()`, `current_user_location()` für `authenticated`
- **Idempotenz:** ✅ `CREATE OR REPLACE`, `IF NOT EXISTS`

### 001_profiles.sql

- **Table:** `profiles` (PK `id` REFERENCES `auth.users` CASCADE)
- **Indexes:** `idx_profiles_location` (GIST), `idx_profiles_role`, `idx_profiles_trust_level`
- **Trigger:** `update_profiles_updated_at` → `update_updated_at_column()`
- **RLS:** ENABLED
- **Policies:**
  - "Own profile full access" (ALL, own row)
  - "Admin full access profiles" (ALL, `is_admin()`)
  - "Booking participant profile details" (SELECT, via bookings join)
  - "Verified helpers public" (SELECT, role=helper & trust_level IN silver/gold)
- **View:** `public_profiles` (nur öffentliche Spalten, `trust_level != 'basic'`)
- **Grants:** `SELECT` auf `public_profiles` für `authenticated, anon`
- **Konflikt-Risiko:** Remote hat bereits `profiles` Tabelle → `CREATE TABLE` schlägt fehl

### 002_pets.sql

- **Table:** `pets` (PK `id`, FK `owner_id` → `profiles.id` CASCADE)
- **Indexes:** `idx_pets_owner`, `idx_pets_species`, `idx_pets_microchip` (partial)
- **Trigger:** `update_pets_updated_at`
- **RLS:** ENABLED
- **Policies:** "Owners manage own pets" (ALL), "Helpers view pets of active bookings" (SELECT via bookings join)
- **Konflikt-Risiko:** Remote hat bereits `pets` Tabelle → `CREATE TABLE` schlägt fehl

### 003_bookings.sql

- **Types:** `booking_type`, `booking_status`, `key_handoff_type`, `currency` (ENUMs)
- **Table:** `bookings` (PK `id`, FKs zu `profiles` (seeker/helper), `pets`)
- **Indexes:** 5 Standard-Indizes
- **Trigger:** `update_bookings_updated_at`
- **RLS:** ENABLED
- **Policies:** "Participants read booking" (SELECT), "Seeker create booking" (INSERT), "Admin manage bookings" (ALL via `is_admin()`)
- **RPCs (7):** `helper_accept_booking`, `helper_reject_booking`, `seeker_cancel_booking`, `helper_start_booking`, `helper_complete_booking`, `seeker_rate_helper`, `helper_rate_seeker` (alle SECURITY DEFINER, `SET search_path = public`)
- **Grants:** EXECUTE auf alle 7 RPCs für `authenticated`
- **Wichtig:** `requests` Tabelle im Remote wird NICHT von lokalen Migrationen abgedeckt

### 004_tracking.sql

- **Tables:** `tracking_sessions` (FK → `bookings`), `tracking_points` (FK → `tracking_sessions`)
- **Indexes:** je 1 pro Tabelle
- **Triggers:** `update_tracking_sessions_updated_at`
- **RLS:** ENABLED auf beiden
- **Policies:** Teilnehmer lesen, Helper managt (via bookings join)

### 010_timebank.sql

- **Type:** `timebank_tx_type` (ENUM)
- **Tables:** `timebank_accounts` (PK `user_id` → `profiles`), `timebank_transactions` (FK → `profiles`, UNIQUE auf `reference_type, reference_id`)
- **Indexes:** 2
- **Trigger:** `update_timebank_accounts_updated_at`
- **RLS:** ENABLED, Policies: own view, Admin via `is_admin()`
- **RPC:** `timebank_adjust()` (SECURITY DEFINER, Race-condition-sicher via 2-Step INSERT + SELECT FOR UPDATE, Idempotenz via UNIQUE Constraint)
- **Grant:** EXECUTE für `authenticated`

### 014_storage_buckets.sql

- **Buckets (4):** `avatars` (public), `pet-photos` (private), `hazard-photos` (private), `verification-docs` (private)
- **Alle:** `INSERT ... ON CONFLICT (id) DO NOTHING` ✅
- **Policies:** Je 4-5 pro Bucket (INSERT/SELECT/UPDATE/DELETE)
- **Referenzierte Tabellen:** `hazards` (in Policy für `hazard-photos`) – **Tabelle existiert erst in fehlender Migration 006!**

### 015_realtime.sql

- **Publication:** `supabase_realtime` ADD TABLE für: `bookings`, `messages`, `hazards`, `tracking_sessions`, `notifications`, `timebank_transactions`, `community_events`, `missing_pets`
- **Function:** `tracking_live_position()` (STABLE)
- **Referenzierte Tabellen:** `messages`, `hazards`, `community_events`, `missing_pets` – **existieren erst in fehlenden Migrationen!**

### 016_functions.sql

- **Functions:** `haversine_distance()` (IMMUTABLE), `find_nearby_helpers()` (STABLE, nutzt `booking_type` Enum), `get_active_hazards_in_radius()` (STABLE, nutzt `hazards`), `get_user_stats()` (STABLE, nutzt `bookings`, `timebank_accounts`)
- **Alle:** `CREATE OR REPLACE` ✅

### 017_indexes.sql

- **Indexes:** 35 zusätzliche Indizes (komposite, partielle)
- **Referenzierte Tabellen:** `messages`, `hazards`, `hazard_sightings`, `missing_pets`, `community_events`, `verifications`, `helper_availabilities`, `notifications`, `devices` – **alle in fehlenden Migrationen!**

---

## 3. Remote-Zustand vs. Lokale Migrationen

### Remote-Tabellen (aktuell)

| Tabelle    | Status | In lokalen Migrationen?         |
| ---------- | ------ | ------------------------------- |
| `profiles` | Leer   | ✅ 001                          |
| `pets`     | Leer   | ✅ 002                          |
| `requests` | Leer   | ❌ **Nein** (lokal: `bookings`) |

### Konflikte bei `supabase db push` auf bestehendem Remote

| Migration | Problem                                                                                                   | Schwere            |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------------ |
| 001       | `CREATE TABLE profiles` → Tabelle existiert bereits                                                       | 🔴 **Blocker**     |
| 002       | `CREATE TABLE pets` → Tabelle existiert bereits                                                           | 🔴 **Blocker**     |
| 003       | `CREATE TYPE booking_type` etc. → OK (nicht existent), aber `CREATE TABLE bookings` → OK (nicht existent) | 🟡 OK für bookings |
| 014       | Policy für `hazard-photos` referenziert `hazards` Tabelle → **existiert nicht** (fehlende Migration 006)  | 🔴 **Blocker**     |
| 015       | `ALTER PUBLICATION ADD TABLE messages/hazards/...` → Tabellen existieren nicht                            | 🔴 **Blocker**     |
| 017       | Indizes auf `messages`, `hazards`, etc. → Tabellen existieren nicht                                       | 🔴 **Blocker**     |

---

## 4. Idempotenz- & Konflikt-Prüfung

### ✅ Idempotent / Sicher

- 000: Extensions (`IF NOT EXISTS`), Functions (`OR REPLACE`), Grants
- 003: ENUM Types (fehlen remote), RPCs (`OR REPLACE`), Grants
- 010: Types, Tables (fehlen remote), RPC (`OR REPLACE`), Unique Constraint
- 014: Buckets (`ON CONFLICT DO NOTHING`), Policies (fehlen remote)
- 016: Functions (`OR REPLACE`)

### ❌ Nicht-idempotent / Konfliktreich

- 001: `CREATE TABLE profiles` (existiert remote)
- 002: `CREATE TABLE pets` (existiert remote)
- 004: `CREATE TABLE tracking_sessions/points` (fehlen remote → OK), aber Policies referenzieren `bookings` (OK)
- 014: Policies für `hazard-photos` referenzieren fehlende `hazards` Tabelle
- 015: Publication ADD TABLE für fehlende Tabellen
- 017: Indizes für fehlende Tabellen

---

## 5. Migrationsplan – Empfohlene Vorgehensweise

### Schritt 0: Remote bereinigen (MANUELL, einmalig)

```sql
-- Im Supabase Dashboard / SQL Editor ausführen
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```

> **Begründung:** `profiles` und `pets` sind leer und werden von Migration 001/002 neu erstellt. `requests` wird durch `bookings` ersetzt.

### Schritt 1: Fehlende Migrationen erstellen (005–009, 011–013)

Die Migrationen 014, 015, 017 referenzieren Tabellen, die in den fehlenden Migrationen definiert werden. Ohne diese schlägt `db push` fehl.

**Mindestens erforderliche neue Migrationen:**

| Nr. | Vorschlag                       | Inhalt                                                             |
| --- | ------------------------------- | ------------------------------------------------------------------ |
| 005 | `005_messages.sql`              | `messages` Tabelle, RLS, Policies                                  |
| 006 | `006_hazards.sql`               | `hazards` Tabelle, RLS, Policies (Voraussetzung für 014, 015, 017) |
| 007 | `007_hazard_sightings.sql`      | `hazard_sightings` Tabelle                                         |
| 008 | `008_missing_pets.sql`          | `missing_pets` Tabelle                                             |
| 009 | `009_community_events.sql`      | `community_events`, `event_participants`                           |
| 011 | `011_verifications.sql`         | `verifications` Tabelle                                            |
| 012 | `012_helper_availabilities.sql` | `helper_availabilities` Tabelle                                    |
| 013 | `013_notifications_devices.sql` | `notifications`, `devices` Tabellen                                |

### Schritt 2: Migration 001 & 002 anpassen (Optional)

Wenn Remote-Tabellen in Schritt 0 gelöscht werden: **Keine Änderung nötig**, `CREATE TABLE` funktioniert dann.

**Falls Tabellen NICHT gelöscht werden sollen:** Migrationen 001/002 müssten auf `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` für fehlende Spalten/Constraints umgestellt werden. **Nicht empfohlen** – sauberer Reset ist besser.

### Schritt 3: Ausführungsreihenfolge

```powershell
# 1. Remote bereinigen (manuell im Dashboard)
# 2. Fehlende Migrationen 005-009, 011-013 erstellen
# 3. Dann pushen:
supabase db push
```

### Schritt 4: Nach Push validieren

```powershell
supabase db diff --schema public  # Sollte leer sein
supabase migration list            # Sollte 000-017 + neue zeigen
```

---

## 6. Zusammenfassung & Entscheidung

| Aspekt                                  | Status                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| Remote Tabellen löschbar                | ✅ Ja (alle leer)                                                               |
| Migrationen 000-017 unverändert nutzbar | ❌ **Nein** – 8 Migrationen fehlen, 014/015/017 referenzieren fehlende Tabellen |
| Benötigte Anpassungen                   | 8 neue Migrationen erstellen (005-009, 011-013)                                 |
| Remote bereinigen vor Push              | **Erforderlich** (3 Tabellen droppen)                                           |
| Sichere Reihenfolge                     | 1. Remote clean → 2. Fehlende Migrationen → 3. db push                          |

---

## 7. Nächste Aktionen (User-Entscheidung)

1. **Bestätigung:** Remote-Tabellen `profiles`, `pets`, `requests` im Dashboard löschen?
2. **Fehlende Migrationen:** Sollen 005-009, 011-013 basierend auf Schema-Types generiert werden?
3. **Danach:** `supabase db push` ausführen

**Keine automatische Ausführung ohne explizite Freigabe.**
