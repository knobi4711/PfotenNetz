-- Consolidate small-mammal availability into "Andere" and link "Gassi" to dogs,
-- mirroring the existing "Ausreiten" → horse behaviour.
--
-- `rabbit`/`guinea_pig` remain valid pet species for pet profiles and can still
-- be used as search filters. They are simply no longer separate helper
-- availability categories; helpers who accept "Andere" cover them.

-- 1. Fold existing small-mammal availability entries into "Andere".
UPDATE public.helper_availabilities
SET pet_species = (
  SELECT ARRAY(
    SELECT DISTINCT
      CASE WHEN species IN ('rabbit', 'guinea_pig') THEN 'other' ELSE species END
    FROM unnest(pet_species) AS species
    ORDER BY 1
  )
)
WHERE pet_species && ARRAY['rabbit', 'guinea_pig'];

ALTER TABLE public.helper_availabilities
  ALTER COLUMN pet_species
  SET DEFAULT ARRAY['dog', 'cat', 'bird', 'horse', 'amphibian', 'fish', 'other'];

-- 2. Walking offers require dogs, just like riding offers require horses.
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
    IF v_type NOT IN ('walk', 'feeding', 'vacation', 'daycare', 'ride') THEN
      RAISE EXCEPTION 'Invalid booking type: %', v_type;
    END IF;
  END LOOP;
  IF 'walk' = ANY(NEW.booking_types) AND NOT ('dog' = ANY(NEW.pet_species)) THEN
    RAISE EXCEPTION 'Walking availability requires dog species';
  END IF;
  IF 'ride' = ANY(NEW.booking_types) AND NOT ('horse' = ANY(NEW.pet_species)) THEN
    RAISE EXCEPTION 'Riding availability requires horse species';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Search: "Andere" also covers rabbit/guinea-pig filters, because those are
--    no longer selectable as separate availability categories.
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
      AND (
        p_pet_species IS NULL
        OR p_pet_species = ANY(a.pet_species)
        OR (p_pet_species IN ('rabbit', 'guinea_pig') AND 'other' = ANY(a.pet_species))
      )
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
