-- PostGIS exposes spatial_ref_sys in the public schema. The extension owns
-- this table, so the project migration role cannot enable RLS on it. Revoke
-- API-facing privileges instead; PostGIS functions continue to use it
-- internally without exposing it through PostgREST.
REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
