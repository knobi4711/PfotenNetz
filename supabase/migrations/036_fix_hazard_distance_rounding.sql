-- PostgreSQL only supports round(value, decimals) for NUMERIC, not DOUBLE PRECISION.
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT h.id, h.hazard_number, h.type::TEXT, h.severity::TEXT,
    ST_Y(h.location::geometry), ST_X(h.location::geometry), h.radius_km,
    h.description,
    round((haversine_distance(p_latitude, p_longitude,
      ST_Y(h.location::geometry), ST_X(h.location::geometry)) / 1000)::NUMERIC, 2),
    h.created_at
  FROM public.hazards AS h
  WHERE h.status = 'active'
    AND h.expires_at > NOW()
    AND haversine_distance(p_latitude, p_longitude,
      ST_Y(h.location::geometry), ST_X(h.location::geometry)) <= p_radius_km * 1000
  ORDER BY h.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_active_hazards_in_radius_v2(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC)
  TO authenticated;
