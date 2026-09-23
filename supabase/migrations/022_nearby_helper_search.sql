-- Harden and extend nearby helper search for the mobile map.
-- Returned coordinates are rounded to ~100 m to avoid exposing exact home locations.

DROP FUNCTION IF EXISTS public.find_nearby_helpers(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INT);

CREATE FUNCTION public.find_nearby_helpers(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km NUMERIC DEFAULT 2.0,
  p_limit INT DEFAULT 20
) RETURNS TABLE (
  helper_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  trust_level TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km NUMERIC,
  rating NUMERIC,
  total_walks INT
) AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  IF p_radius_km NOT BETWEEN 0.5 AND 50 THEN
    RAISE EXCEPTION 'Radius must be between 0.5 and 50 km';
  END IF;

  IF p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 50';
  END IF;

  RETURN QUERY
  SELECT
    profiles.id AS helper_id,
    profiles.display_name,
    profiles.avatar_url,
    profiles.trust_level,
    ROUND(ST_Y(profiles.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION AS latitude,
    ROUND(ST_X(profiles.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION AS longitude,
    ROUND(
      public.haversine_distance(
        p_latitude,
        p_longitude,
        ST_Y(profiles.location::geometry),
        ST_X(profiles.location::geometry)
      )::NUMERIC / 1000,
      2
    ) AS distance_km,
    COALESCE(AVG(bookings.rating_helper), 0)::NUMERIC AS rating,
    COUNT(bookings.id) FILTER (WHERE bookings.status = 'completed')::INT AS total_walks
  FROM public.profiles AS profiles
  LEFT JOIN public.bookings AS bookings ON bookings.helper_id = profiles.id
  WHERE profiles.role = 'helper'
    AND profiles.trust_level IN ('silver', 'gold')
    AND profiles.location IS NOT NULL
    AND profiles.id <> auth.uid()
    AND ST_DWithin(
      profiles.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    )
  GROUP BY profiles.id
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.find_nearby_helpers(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_helpers(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INT) TO authenticated;
