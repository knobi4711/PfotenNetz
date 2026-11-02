-- Security Advisor 0013_rls_disabled_in_public:
-- public.spatial_ref_sys is exposed through PostgREST without RLS.
--
-- On hosted projects PostGIS is installed in the public schema by
-- supabase_admin, which also owns spatial_ref_sys. Migration 066 tried to
-- revoke the Data API privileges, but REVOKE only removes privileges granted
-- by the executing role. supabase_admin is the grantor here, so those
-- statements were no-ops and the table stayed readable and writable with the
-- anon key.
--
-- Only the table owner can enable RLS or manage its policies. This migration
-- applies the full fix where postgres owns the table (local development and
-- fresh resets) and warns otherwise. Hosted projects need Supabase Support to
-- run the statements as supabase_admin; see docs/spatial-ref-sys-rls.md.

do $$
declare
  v_owner name;
begin
  select pg_get_userbyid(c.relowner)
    into v_owner
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'spatial_ref_sys';

  if v_owner is null then
    raise notice 'public.spatial_ref_sys not found, skipping RLS lockdown';
    return;
  end if;

  if v_owner <> current_user then
    raise warning
      'public.spatial_ref_sys is owned by %, so % cannot enable RLS on it. Open a Supabase support ticket with the SQL from docs/spatial-ref-sys-rls.md.',
      v_owner,
      current_user;
    return;
  end if;

  alter table public.spatial_ref_sys enable row level security;

  -- PostGIS functions such as ST_Transform read the SRID definitions as the
  -- calling role, so API roles keep read access while writes stay blocked.
  drop policy if exists spatial_ref_sys_public_read on public.spatial_ref_sys;
  create policy spatial_ref_sys_public_read
    on public.spatial_ref_sys
    for select
    to anon, authenticated
    using (true);

  revoke insert, update, delete, truncate
    on public.spatial_ref_sys
    from anon, authenticated;

  grant select on public.spatial_ref_sys to anon, authenticated;
end
$$;
