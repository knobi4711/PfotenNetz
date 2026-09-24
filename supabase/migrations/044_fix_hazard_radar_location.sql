-- PfotenNetz Migration 044: Use the explicitly authorized radar location
--
-- The radar already receives a foreground location from the client. Its RPC
-- must filter against that point rather than the potentially stale profile
-- location used by the generic hazards RLS policy.

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
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
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
      ST_Y(h.location::geometry), ST_X(h.location::geometry)) <= p_radius_km * 1000
  ORDER BY h.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_hazards_in_radius_v2(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_hazards_in_radius_v2(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC)
  TO authenticated;
