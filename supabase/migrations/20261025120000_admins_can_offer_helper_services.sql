-- Admins may also offer care work as helpers.
--
-- `profiles.role` is a single value, so promoting an administrator to 'helper'
-- would remove their moderation rights. Instead, keep the admin role and treat
-- verified admins as helper-capable everywhere helpers are discovered or
-- contacted. The verification workflow already leaves the role untouched for
-- admins (migration 071) and still raises trust_level to 'silver'.
--
-- Helper discovery additionally requires a stored location and an active
-- availability slot, so admins opt in by maintaining those like helpers do.

-- 1. Nearby helper search: verified admins are candidates too.
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
  IF p_pet_species IS NOT NULL AND p_pet_species NOT IN ('dog', 'cat', 'rabbit', 'guinea_pig', 'bird', 'horse', 'amphibian', 'fish', 'other') THEN RAISE EXCEPTION 'Invalid pet species'; END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT profiles.id, profiles.display_name, profiles.avatar_url, profiles.trust_level, profiles.location,
      public.haversine_distance(p_latitude, p_longitude, ST_Y(profiles.location::geometry), ST_X(profiles.location::geometry)) / 1000 AS distance_km
    FROM public.profiles AS profiles
    WHERE profiles.role IN ('helper', 'admin') AND profiles.trust_level IN ('silver', 'gold')
      AND profiles.location IS NOT NULL AND profiles.id <> auth.uid()
      AND ST_DWithin(profiles.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_km * 1000)
  ), matching AS (
    SELECT h.id AS helper_id,
      ARRAY_AGG(DISTINCT a.day_of_week ORDER BY a.day_of_week) AS available_days,
      ARRAY(SELECT DISTINCT species FROM public.helper_availabilities a2, unnest(a2.pet_species) species WHERE a2.helper_id = h.id AND a2.is_active) AS accepted_species
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

REVOKE ALL ON FUNCTION public.find_nearby_helpers(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INT, booking_type, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_helpers(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INT, booking_type, TEXT, INT) TO authenticated;

-- 2. Helper detail page: verified admins are reachable like helpers.
CREATE OR REPLACE FUNCTION public.get_helper_detail(
  p_helper_id UUID
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
  slots JSONB
) AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lon DOUBLE PRECISION;
  v_has_location BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Seeker location is optional: distance is NULL when the caller has none.
  SELECT ST_Y(location::geometry), ST_X(location::geometry)
    INTO v_lat, v_lon
    FROM public.profiles WHERE id = auth.uid();

  IF v_lat IS NOT NULL AND v_lon IS NOT NULL THEN
    v_has_location := TRUE;
  END IF;

  RETURN QUERY
  SELECT
    helper.id,
    helper.display_name,
    helper.avatar_url,
    helper.trust_level,
    ROUND(ST_Y(helper.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION,
    ROUND(ST_X(helper.location::geometry)::NUMERIC, 3)::DOUBLE PRECISION,
    CASE
      WHEN v_has_location THEN ROUND(
        public.haversine_distance(
          v_lat, v_lon,
          ST_Y(helper.location::geometry),
          ST_X(helper.location::geometry)
        )::NUMERIC / 1000, 2
      )
      ELSE NULL
    END,
    COALESCE(ratings.rating, 0),
    COALESCE(ratings.total_walks, 0),
    COALESCE(availability.available_days, '{}'::INT[]),
    COALESCE(availability.slots, '[]'::JSONB)
  FROM public.profiles AS helper
  LEFT JOIN LATERAL (
    SELECT
      AVG(bookings.rating_helper)::NUMERIC AS rating,
      COUNT(bookings.id) FILTER (WHERE bookings.status = 'completed')::INT AS total_walks
    FROM public.bookings AS bookings
    WHERE bookings.helper_id = helper.id
  ) AS ratings ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      ARRAY_AGG(DISTINCT slots.day_of_week ORDER BY slots.day_of_week) AS available_days,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'day_of_week', slots.day_of_week,
          'start_time', slots.start_time::TEXT,
          'end_time', slots.end_time::TEXT,
          'booking_types', slots.booking_types,
          'max_distance_km', slots.max_distance_km
        )
        ORDER BY slots.day_of_week, slots.start_time
      ) AS slots
    FROM public.helper_availabilities AS slots
    WHERE slots.helper_id = helper.id
      AND slots.is_active
  ) AS availability ON TRUE
  WHERE helper.id = p_helper_id
    AND helper.role IN ('helper', 'admin')
    AND helper.trust_level IN ('silver', 'gold')
    AND helper.location IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Helper not found';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_helper_detail(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_helper_detail(UUID) TO authenticated;

-- 3. Contact requests: verified admins can be contacted as helpers.
DROP POLICY IF EXISTS "Users can create contact requests" ON public.contact_requests;
CREATE POLICY "Users can create contact requests" ON public.contact_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = helper_id AND role IN ('helper', 'admin') AND trust_level IN ('silver', 'gold')
    )
  );
