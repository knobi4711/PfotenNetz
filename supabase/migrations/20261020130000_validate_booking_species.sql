-- A walking request is only suitable for dogs. Enforce this for both new
-- bookings and edits so clients cannot bypass the form validation.
CREATE OR REPLACE FUNCTION public.validate_booking_species_compatibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_species TEXT;
BEGIN
  IF NEW.type = 'walk' THEN
    SELECT species INTO v_species
    FROM public.pets
    WHERE id = NEW.pet_id;

    IF v_species IS DISTINCT FROM 'dog' THEN
      RAISE EXCEPTION 'Gassirunden sind nur für Hunde möglich';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_booking_species_compatibility_before_write ON public.bookings;
CREATE TRIGGER validate_booking_species_compatibility_before_write
  BEFORE INSERT OR UPDATE OF type, pet_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_species_compatibility();

REVOKE ALL ON FUNCTION public.validate_booking_species_compatibility() FROM PUBLIC;
