# Phase 3 Remote Preflight Check

**Datum:** 2026-09-20  
**Status:** Kein Supabase CLI installiert, kein Remote-Projekt verknüpft

---

## 1. Supabase CLI Status

```text
Supabase CLI: NICHT INSTALLIERT
```

- `supabase --version` → Command not found
- `docker --version` → Command not found
- Kein Docker Desktop / Docker Engine verfügbar

---

## 2. Remote-Projekt Verknüpfung

```text
Remote-Projekt verknüpft: NEIN
```

- Kein `.supabase/` Verzeichnis im Repository
- Keine `config.toml` mit echter Project-ID (nur Template: `pfotennetz-local`)
- Keine Link-Referenz zu einem echten Supabase-Projekt

**Erforderlich für Verknüpfung:**

- Project ID des existierenden Supabase-Projekts
- Optional: Organization ID

---

## 3. Lokale Migrationen vs. Remote-Zustand

### Lokale Migrationen (10 Dateien, nicht 18)

| #   | Datei                 | Status                                     |
| --- | --------------------- | ------------------------------------------ |
| 000 | `extensions.sql`      | Scaffold/Helper                            |
| 001 | `profiles.sql`        | Schema + RLS + View `public_profiles`      |
| 002 | `pets.sql`            | Schema + RLS                               |
| 003 | `bookings.sql`        | Schema + RLS + 7 RPCs                      |
| 004 | `tracking.sql`        | Schema + RLS                               |
| 010 | `timebank.sql`        | Schema + RLS + RPC `timebank_adjust()`     |
| 014 | `storage_buckets.sql` | Storage Policies (4 Buckets)               |
| 015 | `realtime.sql`        | Realtime Publications                      |
| 016 | `functions.sql`       | Helper Functions (Haversine, Nearby, etc.) |
| 017 | `indexes.sql`         | Performance Indexes                        |

**Hinweis:** Migrationen 005-009 und 011-013 existieren nicht (Lücken in Nummerierung).

### Remote-Zustand

```text
Remote-Datenbank: UNBEKANNT (keine Verbindung)
```

Da keine Supabase CLI und keine Projekt-Verknüpfung existieren, kann der Remote-Zustand **nicht** festgestellt werden.

---

## 4. Daten-Risiko

```text
Daten-Risiko: NICHT BEURTEILBAR
```

- Ohne Verbindung zum Remote-Projekt unbekannt, ob Tabellen/Daten existieren
- Falls Projekt existiert und Daten enthält: `supabase db push` könnte bei Konflikten fehlschlagen oder Daten überschreiben (je nach Migration-Inhalt)
- Lokale Migrationen verwenden `ON CONFLICT DO NOTHING` / `IF NOT EXISTS` für Buckets, aber `CREATE TABLE` ohne `IF NOT EXISTS` → würde bei existierenden Tabellen fehlschlagen

---

## 5. Migrations-Kompatibilität (Prognose)

| Aspekt              | Prognose                                   | Begründung                                                                 |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `CREATE EXTENSION`  | ⚠️ Möglicher Konflikt                      | Wenn Extensions bereits aktiv, OK. Wenn nicht, braucht Superuser-Rechte.   |
| `CREATE TABLE`      | 🔴 **Konflikt bei existierenden Tabellen** | Kein `IF NOT EXISTS` in 001-004, 010                                       |
| `CREATE POLICY`     | ⚠️ Möglicher Konflikt                      | `ON CONFLICT DO NOTHING` nicht für Policies; `DROP POLICY IF EXISTS` fehlt |
| `CREATE FUNCTION`   | ⚠️ `OR REPLACE` vorhanden                  | `CREATE OR REPLACE FUNCTION` → OK für Updates                              |
| `CREATE VIEW`       | ⚠️ Möglicher Konflikt                      | `public_profiles` View ohne `OR REPLACE`                                   |
| `CREATE INDEX`      | ⚠️ Möglicher Konflikt                      | `CREATE INDEX` ohne `IF NOT EXISTS`                                        |
| `ALTER PUBLICATION` | ✅ Idempotent                              | `ALTER PUBLICATION ... ADD TABLE` ist idempotent                           |
| Storage Buckets     | ✅ `ON CONFLICT DO NOTHING`                | In 014 verwendet                                                           |

---

## 6. Generated Types

```text
Generated Types: NICHT MÖGLICH (keine Datenbank-Verbindung)
```

- `packages/supabase/src/types/database.ts` ist derzeit manueller Placeholder
- Echte Types erfordern: `supabase gen types typescript --project-id <ID>` oder lokaler DB-Zugriff

---

## 7. Zusammenfassung & Entscheidung

| Kriterium                 | Status       |
| ------------------------- | ------------ |
| Supabase CLI installiert  | 🔴 NEIN      |
| Docker verfügbar          | 🔴 NEIN      |
| Remote-Projekt verknüpft  | 🔴 NEIN      |
| Remote-Zustand bekannt    | 🔴 NEIN      |
| Migrationen anwendbar     | ⚠️ UNBEKANNT |
| Daten-Risiko beherrschbar | ⚠️ UNBEKANNT |
| **Ready for db push**     | **NO**       |

---

## Nächste Schritte (erforderlich vor `supabase db push`)

1. **Supabase CLI installieren** (nicht global ungefragt – Anleitung geben)

   ```powershell
   # Windows (PowerShell)
   scoop install supabase
   # oder
   npm install -g supabase
   ```

2. **Docker Desktop installieren & starten** (Voraussetzung für `supabase start` lokal, optional für Remote-only Workflow)

3. **Remote-Projekt verknüpfen**

   ```powershell
   supabase link --project-ref <PROJECT_ID>
   ```

   → Erfordert echte Project ID des existierenden Supabase-Projekts

4. **Remote-Status prüfen**

   ```powershell
   supabase db diff --schema public
   supabase migration list
   ```

5. **Falls Remote leer:** `supabase db push` möglich
   **Falls Remote nicht leer:** Manuelle Konflikt-Analyse nötig vor Push

6. **Generated Types erzeugen** (nach erfolgreichem Push):
   ```powershell
   supabase gen types typescript --project-id <PROJECT_ID> > packages/supabase/src/types/database.ts
   ```

---

## STOPP

**Kein `supabase db push` ausgeführt.**  
**Keine Änderungen am Remote-Projekt.**

Warte auf:

- Project ID des existierenden Supabase-Projekts
- Installation von Supabase CLI (durch User/DevOps)
- Entscheidung über Vorgehen

---

**Ende Preflight. Bericht an User übergeben.**
