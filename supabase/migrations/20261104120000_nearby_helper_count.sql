-- Kennzahl: Anzahl verifizierter Helfer:innen in der eigenen Umgebung.
--
-- Zählt dieselben Profile, die auch die Helfersuche (find_nearby_helpers)
-- anzeigt: verifizierte Helfer:innen mit aktivem Verfügbarkeitsfenster, deren
-- eigener Aktionsradius den Standort der aufrufenden Person abdeckt. Als
-- Suchradius dient der im Profil hinterlegte Nachbarschafts-Radius.
--
-- Ohne hinterlegten Standort liefert die Funktion NULL, damit die Oberfläche
-- zwischen "keine Helfer:innen gefunden" und "Standort fehlt" unterscheiden
-- kann. Es werden ausschließlich aggregierte Zahlen zurückgegeben.

create or replace function public.nearby_helper_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case
    when me.location is null then null
    else (
      select count(distinct helper.id)::bigint
      from public.profiles as helper
      join public.helper_availabilities as availability
        on availability.helper_id = helper.id
       and availability.is_active
      where helper.id <> me.id
        and helper.role = 'helper'
        and helper.trust_level in ('silver', 'gold')
        and helper.location is not null
        and public.haversine_distance(
              st_y(me.location::geometry),
              st_x(me.location::geometry),
              st_y(helper.location::geometry),
              st_x(helper.location::geometry)
            ) / 1000 <= availability.max_distance_km
        and st_dwithin(
              helper.location,
              me.location,
              (coalesce(me.kiez_radius_km, 1.5) * 1000)::double precision
            )
    )
  end
  from public.profiles as me
  where me.id = auth.uid();
$$;

revoke all on function public.nearby_helper_count() from public;
grant execute on function public.nearby_helper_count() to authenticated;
