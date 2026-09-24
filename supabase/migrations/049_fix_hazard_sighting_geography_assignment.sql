-- PfotenNetz Migration 049: Explicitly cast WKT to the table geography type

CREATE OR REPLACE FUNCTION public.record_hazard_sighting(
  p_hazard_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_description TEXT DEFAULT NULL
)
RETURNS public.hazard_sightings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  result public.hazard_sightings;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid sighting location';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.hazards
    WHERE id = p_hazard_id
      AND status = 'active'
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Hazard is not active';
  END IF;

  INSERT INTO public.hazard_sightings (hazard_id, reporter_id, location, description)
  VALUES (
    p_hazard_id,
    auth.uid(),
    format('SRID=4326;POINT(%s %s)', p_longitude, p_latitude)::geography,
    NULLIF(trim(p_description), '')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_hazard_sighting(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_hazard_sighting(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT)
  TO authenticated;
