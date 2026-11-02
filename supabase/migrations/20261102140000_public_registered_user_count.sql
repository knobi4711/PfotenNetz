-- Öffentliche Kennzahl: Anzahl registrierter Profile.
--
-- public.profiles ist durch RLS geschützt, anon/authenticated können dort also
-- nicht zählen. Diese Funktion liefert ausschließlich die aggregierte Zahl –
-- keine Profildaten – und ist bewusst auch ohne Session aufrufbar, damit die
-- Zahl in App und Web angezeigt werden kann.

create or replace function public.registered_user_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint from public.profiles;
$$;

revoke all on function public.registered_user_count() from public;
grant execute on function public.registered_user_count() to anon, authenticated;
