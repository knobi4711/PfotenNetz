-- Validate booking inserts that seekers create directly (RLS allows INSERT,
-- all state changes afterwards stay RPC-only). Ensures the pet belongs to the
-- seeker, the time range is sane, and the booking starts as 'requested'.

CREATE OR REPLACE FUNCTION public.validate_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF NEW.seeker_id IS NULL THEN
    RAISE EXCEPTION 'Booking seeker is required';
  END IF;

  SELECT owner_id INTO v_owner_id
  FROM public.pets
  WHERE id = NEW.pet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pet not found';
  END IF;

  IF v_owner_id IS DISTINCT FROM NEW.seeker_id THEN
    RAISE EXCEPTION 'Pet does not belong to the seeker';
  END IF;

  IF NEW.end_at IS NULL OR NEW.start_at IS NULL OR NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'Booking end must be after start';
  END IF;

  IF NEW.status IS DISTINCT FROM 'requested' THEN
    RAISE EXCEPTION 'New bookings must start as requested';
  END IF;

  IF NEW.helper_id IS NOT DISTINCT FROM NEW.seeker_id THEN
    RAISE EXCEPTION 'Seeker and helper must be different users';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_booking_before_insert ON public.bookings;
CREATE TRIGGER validate_booking_before_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_insert();

REVOKE ALL ON FUNCTION public.validate_booking_insert() FROM PUBLIC;
