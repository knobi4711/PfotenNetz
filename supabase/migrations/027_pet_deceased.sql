-- Keep deceased pets for historical records, but prevent new bookings.
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pets_living_active
  ON public.pets(owner_id)
  WHERE is_active = true AND is_deceased = false;

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

  IF EXISTS (SELECT 1 FROM public.pets WHERE id = NEW.pet_id AND is_deceased) THEN
    RAISE EXCEPTION 'Bookings for deceased pets are not allowed';
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
