-- Riding offers and bookings are valid only when a horse is included.
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
  IF 'ride' = ANY(NEW.booking_types) AND NOT ('horse' = ANY(NEW.pet_species)) THEN
    RAISE EXCEPTION 'Riding availability requires horse species';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_booking_species_compatibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_species TEXT;
BEGIN
  IF NEW.type IN ('walk', 'ride') THEN
    SELECT species INTO v_species
    FROM public.pets
    WHERE id = NEW.pet_id;

    IF NEW.type = 'walk' AND v_species IS DISTINCT FROM 'dog' THEN
      RAISE EXCEPTION 'Gassirunden sind nur für Hunde möglich';
    END IF;
    IF NEW.type = 'ride' AND v_species IS DISTINCT FROM 'horse' THEN
      RAISE EXCEPTION 'Ausreiten ist nur mit Pferden möglich';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
