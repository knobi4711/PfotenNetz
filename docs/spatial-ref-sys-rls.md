# Security Advisor: `public.spatial_ref_sys` ohne RLS

## Befund

Der Security Advisor meldet `0013_rls_disabled_in_public` für
`public.spatial_ref_sys`. Die Tabelle gehört zur PostGIS-Extension, die im
Projekt im Schema `public` installiert ist.

## Warum Migration 066 das Problem nicht gelöst hat

Auf dem gehosteten Projekt gehört `spatial_ref_sys` der Rolle `supabase_admin`.
Migration 066 hat zwar die Rechte für `anon` und `authenticated` entzogen, aber
`REVOKE` entfernt nur Rechte, die die ausführende Rolle selbst vergeben hat. Da
`supabase_admin` der Grantor ist, waren die Statements wirkungslos und die
Tabelle blieb über die Data API mit dem Anon-Key les- und schreibbar
(`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`).

Nur der Owner einer Tabelle kann RLS aktivieren, Policies anlegen oder die von
`supabase_admin` vergebenen Rechte entziehen. Die Rolle `postgres` ist weder
Owner noch Mitglied von `supabase_admin` und kann das auf dem gehosteten
Projekt daher nicht selbst beheben.

## Was Migration `20261028120000_lock_down_spatial_ref_sys.sql` macht

- Läuft `postgres` als Owner der Tabelle (lokale Entwicklung, frischer
  `db reset`), aktiviert sie RLS, legt eine reine SELECT-Policy für `anon` und
  `authenticated` an und entzieht die Schreibrechte.
- Gehört die Tabelle `supabase_admin` (gehostetes Projekt), bricht sie nicht ab,
  sondern gibt eine Warnung mit Verweis auf dieses Dokument aus.

Die SELECT-Policy ist nötig, weil PostGIS-Funktionen wie `ST_Transform` die
SRID-Definitionen mit den Rechten der aufrufenden Rolle lesen.

## Warum diese Variante?

Der Advisor nennt zwei Optionen. Umgesetzt wird die Lese-Variante:

- **RLS + SELECT-Policy:** `spatial_ref_sys` enthält ausschließlich öffentliche
  EPSG-Koordinatensystem-Definitionen, keine Projekt- oder Nutzerdaten. Eine
  Policy mit `using (true)` ist damit korrekt.
- **Rechte entziehen:** Wäre ebenfalls möglich, aber `postgres` ist nicht der
  Grantor und kann die Rechte nicht entziehen. Zudem würden PostGIS-Funktionen
  mit `SECURITY INVOKER` die SRID-Definitionen dann nicht mehr finden, wenn sie
  mit `anon`/`authenticated` aufgerufen werden.
- **`public` aus den Exposed Schemas entfernen:** Nicht praktikabel, weil die
  gesamte Data API des Projekts im Schema `public` liegt.

## Gehostetes Projekt: Support-Ticket

Der folgende Text kann im [Supabase Support Center](https://supabase.com/dashboard/support/new)
eingereicht werden. Eine ausführlichere, fertig formatierte englische Vorlage
liegt in [`support-ticket-spatial-ref-sys.md`](./support-ticket-spatial-ref-sys.md).
Die SQL-Blöcke müssen von `supabase_admin` ausgeführt werden.

> **Subject:** Enable RLS on `public.spatial_ref_sys` (project `njkyujhbcolvtcnlahsk`)
>
> Hi Supabase team,
>
> the Security Advisor reports `0013_rls_disabled_in_public` for
> `public.spatial_ref_sys`. The table was created by the `postgis` extension in
> the `public` schema and is owned by `supabase_admin`. Because `supabase_admin`
> is also the grantor, `REVOKE` as `postgres` is a no-op, and `postgres` cannot
> enable RLS or create policies on the table (`must be owner of table
spatial_ref_sys`).
>
> As a result, `anon` and `authenticated` currently have `INSERT`, `UPDATE`,
> `DELETE` and `TRUNCATE` on the table, so it can be modified through the Data
> API with the public anon key. Please run the following statements as
> `supabase_admin`:

```sql
alter table public.spatial_ref_sys enable row level security;

drop policy if exists spatial_ref_sys_public_read on public.spatial_ref_sys;
create policy spatial_ref_sys_public_read
  on public.spatial_ref_sys
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate
  on public.spatial_ref_sys
  from anon, authenticated;
```

> Alternatively, moving the PostGIS extension to the `extensions` schema would
> also clear the finding. Since PostGIS is not relocatable, this has to be done
> by you.

## Verifikation

Nach der Ausführung durch den Support:

```sql
select c.relrowsecurity,
       pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'spatial_ref_sys';
-- erwartet: relrowsecurity = true

select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'spatial_ref_sys';
-- erwartet: spatial_ref_sys_public_read | SELECT | {anon,authenticated} | true

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'spatial_ref_sys'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
-- erwartet nach dem Revoke: nur noch SELECT
```

Selbst wenn die Grants bestehen bleiben, blockiert die SELECT-only-Policy alle
Schreibzugriffe über die Data API.

Anschließend den Linter neu ausführen:

```powershell
supabase db advisors --linked --type security
```

Der Befund `rls_disabled_in_public` für `spatial_ref_sys` darf nicht mehr
auftauchen.

## Nicht empfohlen

`drop extension postgis` und anschließendes `create extension postgis with
schema extensions` löscht alle `geometry`-/`geography`-Spalten und die davon
abhängigen Daten. Ein solcher Umbau darf nur mit vollständigem Backup und auf
einer Testdatenbank erfolgen. Der Support-Weg oben ist nicht destruktiv.
