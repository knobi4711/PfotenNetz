-- Only expose helpers who currently offer an active recurring availability
-- that covers the seeker's distance. Return matching weekdays for the UI.

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
  total_walks INT,
  available_days INT[]
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
  WITH candidates AS (
    SELECT
      profiles.id,
      profiles.display_name,
      profiles.avatar_url,
      profiles.trust_level,
      profiles.location,
      public.haversine_distance(
        p_latitude,
        p_longitude,
        ST_Y(profiles.location::geometry),
        ST_X(profiles.location::geometry)
      ) / 1000 AS distance_km
    FROM public.profiles AS profiles
    WHERE profiles.role = 'helper'
      AND profiles.trust_level IN ('silver', 'gold')
      AND profiles.location IS NOT NULL
      AND profiles.id <> auth.uid()
      AND ST_DWithin(
        profiles.location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        p_radius_km * 1000
      )
  )
  SELECT
    candidates.id,
    candidates.display_name,
    candidates.avatar_url,
    candidates.trust_level,
    ROUND(ST_Y(candidates.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION,
    ROUND(ST_X(candidates.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION,
    ROUND(candidates.distance_km::NUMERIC, 2),
    COALESCE(ratings.rating, 0),
    COALESCE(ratings.total_walks, 0),
    availability.available_days
  FROM candidates
  JOIN LATERAL (
    SELECT ARRAY_AGG(DISTINCT helper_availabilities.day_of_week ORDER BY helper_availabilities.day_of_week) AS available_days
    FROM public.helper_availabilities
    WHERE helper_availabilities.helper_id = candidates.id
      AND helper_availabilities.is_active
      AND helper_availabilities.max_distance_km >= candidates.distance_km
  ) AS availability ON CARDINALITY(availability.available_days) > 0
  LEFT JOIN LATERAL (
    SELECT
      AVG(bookings.rating_helper)::NUMERIC AS rating,
      COUNT(bookings.id) FILTER (WHERE bookings.status = 'completed')::INT AS total_walks
    FROM public.bookings
    WHERE bookings.helper_id = candidates.id
  ) AS ratings ON TRUE
  ORDER BY candidates.distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.find_nearby_helpers(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_helpers(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INT) TO authenticated;
