-- Gefahren: Liste und Detail folgen derselben Warnkreis-Logik.
--
-- Bisher filterte das Radar nach der Entfernung zum Gefahrenzentrum, während
-- Detail, Fotos und Sichtungen nur innerhalb des Warnradius lesbar waren.
-- Jetzt gilt überall: Der Warnkreis der Gefahr muss den relevanten Bereich
-- berühren.
--
-- * Radar: Distanz <= gewählter Suchradius + Warnradius.
-- * Detail/Fotos/Sichtungen: Distanz <= maximaler Radar-Suchradius (3 km,
--   siehe HAZARD_RADAR_RADII in packages/shared/src/constants/geo.ts)
--   + Warnradius. Damit ist alles lesbar, was das Radar zeigen kann.
--
-- Die 3 km sind bewusst gespiegelt: SQL kann die TypeScript-Konstante nicht
-- importieren. Ändert sich der maximale Radar-Radius, muss dieser Wert mit.

CREATE OR REPLACE FUNCTION public.get_active_hazards_in_radius_v2(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km NUMERIC DEFAULT 5.0
) RETURNS TABLE (
  id UUID,
  hazard_number TEXT,
  type TEXT,
  severity TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_km NUMERIC,
  description TEXT,
  distance_km NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_latitude NOT BETWEEN -90 AND 90
    OR p_longitude NOT BETWEEN -180 AND 180
    OR p_radius_km NOT BETWEEN 0.1 AND 10 THEN
    RAISE EXCEPTION 'Invalid radar location or radius';
  END IF;

  RETURN QUERY
  SELECT h.id, h.hazard_number, h.type::TEXT, h.severity::TEXT,
    ST_Y(h.location::geometry), ST_X(h.location::geometry), h.radius_km,
    h.description,
    round((public.haversine_distance(p_latitude, p_longitude,
      ST_Y(h.location::geometry), ST_X(h.location::geometry)) / 1000)::NUMERIC, 2),
    h.created_at
  FROM public.hazards AS h
  WHERE h.status = 'active'
    AND h.expires_at > NOW()
    AND public.haversine_distance(p_latitude, p_longitude,
      ST_Y(h.location::geometry), ST_X(h.location::geometry))
      <= (p_radius_km + h.radius_km) * 1000
  ORDER BY h.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_hazards_in_radius_v2(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_hazards_in_radius_v2(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC)
  TO authenticated;

-- Detailansicht: Warnkreis + maximaler Radar-Radius.
DROP POLICY IF EXISTS "Active hazards readable nearby" ON public.hazards;
CREATE POLICY "Active hazards readable nearby" ON public.hazards
  FOR SELECT USING (
    status = 'active'
    AND expires_at > NOW()
    AND ST_DWithin(
      location,
      public.current_user_location(),
      (radius_km + 3.0) * 1000
    )
  );

-- Sichtungen zu Gefahren: gleiche Regel.
DROP POLICY IF EXISTS "Sightings readable nearby for active hazards" ON public.hazard_sightings;
CREATE POLICY "Sightings readable nearby for active hazards" ON public.hazard_sightings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.hazards h
      WHERE h.id = hazard_sightings.hazard_id
        AND h.status = 'active'
        AND h.expires_at > NOW()
        AND ST_DWithin(
          h.location,
          public.current_user_location(),
          (h.radius_km + 3.0) * 1000
        )
    )
  );

-- Fotos: gleiche Regel, sonst bliebe das Detail ohne Bilder.
DROP POLICY IF EXISTS "Hazard photo read active by nearby users" ON storage.objects;
CREATE POLICY "Hazard photo read active by nearby users" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hazard-photos'
    AND EXISTS (
      SELECT 1 FROM public.hazards h
      WHERE h.id = (storage.foldername(name))[1]::uuid
        AND h.status = 'active'
        AND h.expires_at > NOW()
        AND ST_DWithin(
          h.location,
          public.current_user_location(),
          (h.radius_km + 3.0) * 1000
        )
    )
  );
