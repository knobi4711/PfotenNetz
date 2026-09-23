-- PfotenNetz Migration 025: Helper workflow hardening
-- 1. Secure own-location update (validates ranges, no exact-location leaks in code)
-- 2. Public helper detail RPC (rounded coords, rating, active availabilities)
-- 3. Validate helper_availabilities.booking_types against booking_type enum

-- ---------------------------------------------------------------------------
-- Validate booking_types on helper_availabilities
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_helper_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_type TEXT;
BEGIN
  IF NEW.day_of_week IS NULL OR NEW.day_of_week < 0 OR NEW.day_of_week > 6 THEN
    RAISE EXCEPTION 'day_of_week must be between 0 and 6';
  END IF;

  IF NEW.end_time IS NULL OR NEW.start_time IS NULL OR NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'end_time must be after start_time';
  END IF;

  IF NEW.max_distance_km IS NULL OR NEW.max_distance_km <= 0 OR NEW.max_distance_km > 50 THEN
    RAISE EXCEPTION 'max_distance_km must be between 0 and 50';
  END IF;

  IF NEW.booking_types IS NULL THEN
    NEW.booking_types := '{}';
  END IF;

  FOREACH v_type IN ARRAY NEW.booking_types LOOP
    IF v_type NOT IN ('walk', 'feeding', 'vacation', 'daycare') THEN
      RAISE EXCEPTION 'Invalid booking type: %', v_type;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_helper_availability_before_write ON public.helper_availabilities;
CREATE TRIGGER validate_helper_availability_before_write
  BEFORE INSERT OR UPDATE ON public.helper_availabilities
  FOR EACH ROW EXECUTE FUNCTION public.validate_helper_availability();

REVOKE ALL ON FUNCTION public.validate_helper_availability() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Secure own-location update: caller writes only its own rounded-safe point
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_own_location(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
) RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  UPDATE public.profiles
  SET
    location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    location_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.update_own_location(DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_location(DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- ---------------------------------------------------------------------------
-- Public helper detail: no exact location, only rounded coords + rating + slots
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_helper_detail(UUID);

CREATE FUNCTION public.get_helper_detail(
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
    AND helper.role = 'helper'
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
