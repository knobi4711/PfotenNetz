-- Fix helper search candidate aliases and compare enum/text booking types.
-- Compare their textual representations so filtered searches work on PostgreSQL.
CREATE OR REPLACE FUNCTION public.find_nearby_helpers(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km NUMERIC DEFAULT 2.0,
  p_limit INT DEFAULT 20,
  p_booking_type booking_type DEFAULT NULL,
  p_pet_species TEXT DEFAULT NULL,
  p_day_of_week INT DEFAULT NULL
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
  available_days INT[],
  accepted_species TEXT[]
) AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid coordinates'; END IF;
  IF p_radius_km NOT BETWEEN 0.5 AND 50 THEN RAISE EXCEPTION 'Radius must be between 0.5 and 50 km'; END IF;
  IF p_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Limit must be between 1 and 50'; END IF;
  IF p_day_of_week IS NOT NULL AND p_day_of_week NOT BETWEEN 0 AND 6 THEN RAISE EXCEPTION 'Invalid weekday'; END IF;
  IF p_pet_species IS NOT NULL AND p_pet_species NOT IN ('dog', 'cat', 'rabbit', 'guinea_pig', 'bird', 'other') THEN RAISE EXCEPTION 'Invalid pet species'; END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT profiles.id, profiles.display_name, profiles.avatar_url, profiles.trust_level, profiles.location,
      public.haversine_distance(p_latitude, p_longitude, ST_Y(profiles.location::geometry), ST_X(profiles.location::geometry)) / 1000 AS distance_km
    FROM public.profiles AS profiles
    WHERE profiles.role = 'helper' AND profiles.trust_level IN ('silver', 'gold')
      AND profiles.location IS NOT NULL AND profiles.id <> auth.uid()
      AND ST_DWithin(profiles.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_km * 1000)
  ), matching AS (
    SELECT h.id AS helper_id,
      ARRAY_AGG(DISTINCT a.day_of_week ORDER BY a.day_of_week) AS available_days,
      ARRAY(SELECT DISTINCT species FROM public.helper_availabilities a2, unnest(a2.pet_species) species WHERE a2.helper_id = h.helper_id AND a2.is_active) AS accepted_species
    FROM candidates h
    JOIN public.helper_availabilities a ON a.helper_id = h.id AND a.is_active AND a.max_distance_km >= h.distance_km
      AND (p_booking_type IS NULL OR p_booking_type::TEXT = ANY(a.booking_types))
      AND (p_pet_species IS NULL OR p_pet_species = ANY(a.pet_species))
      AND (p_day_of_week IS NULL OR a.day_of_week = p_day_of_week)
    GROUP BY h.id
  )
  SELECT c.id, c.display_name, c.avatar_url, c.trust_level,
    ROUND(ST_Y(c.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION,
    ROUND(ST_X(c.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION,
    ROUND(c.distance_km::NUMERIC, 2), COALESCE(AVG(b.rating_helper), 0)::NUMERIC,
    COUNT(b.id) FILTER (WHERE b.status = 'completed')::INT, m.available_days, m.accepted_species
  FROM candidates c JOIN matching m ON m.helper_id = c.id
  LEFT JOIN public.bookings b ON b.helper_id = c.id
  GROUP BY c.id, c.display_name, c.avatar_url, c.trust_level, c.location, c.distance_km, m.available_days, m.accepted_species
  ORDER BY c.distance_km ASC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
