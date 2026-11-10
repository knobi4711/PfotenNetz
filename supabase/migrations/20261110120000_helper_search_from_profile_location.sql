-- Helfersuche und Nachbarschaftskarte am Vermittlungsstandort ausrichten.
--
-- Die Helfersuche braucht keine Geräteortung mehr: Maßgeblich ist der im Profil
-- hinterlegte Vermittlungsstandort. Als sichtbar gilt eine Helferin oder ein
-- Helfer genau dann, wenn die eigene Reisebereitschaft (max_distance_km des
-- aktiven Verfügbarkeitsfensters) den Vermittlungsstandort der suchenden Person
-- abdeckt. Ein zusätzlicher, frei wählbarer km-Radius ist dafür nicht nötig.

-- Returns the caller's own Vermittlungsstandort. Only the owner can read it, so
-- the exact coordinate is safe and keeps the client-side map center identical
-- to the location used by find_nearby_helpers. Helpers still receive only
-- rounded coordinates.
CREATE OR REPLACE FUNCTION public.helper_search_origin()
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ST_Y(location::geometry)::DOUBLE PRECISION,
    ST_X(location::geometry)::DOUBLE PRECISION
  FROM public.profiles
  WHERE id = auth.uid() AND location IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.helper_search_origin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.helper_search_origin() TO authenticated;

-- Kennzahl an die neue Suchlogik angleichen: Es zählt die eigene
-- Reisebereitschaft der Helfer:innen, nicht mehr der Nachbarschafts-Radius der
-- suchenden Person. Der Nachbarschafts-Radius bleibt für offene Anfragen und
-- Buchungen unverändert bestehen.
CREATE OR REPLACE FUNCTION public.nearby_helper_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN me.location IS NULL THEN NULL
    ELSE (
      SELECT COUNT(DISTINCT helper.id)::bigint
      FROM public.profiles AS helper
      JOIN public.helper_availabilities AS availability
        ON availability.helper_id = helper.id
       AND availability.is_active
      WHERE helper.id <> me.id
        AND helper.role IN ('helper', 'admin')
        AND helper.trust_level IN ('silver', 'gold')
        AND helper.location IS NOT NULL
        AND public.haversine_distance(
              ST_Y(me.location::geometry),
              ST_X(me.location::geometry),
              ST_Y(helper.location::geometry),
              ST_X(helper.location::geometry)
            ) / 1000 <= availability.max_distance_km
    )
  END
  FROM public.profiles AS me
  WHERE me.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.nearby_helper_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearby_helper_count() TO authenticated;
