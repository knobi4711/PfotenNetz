-- PfotenNetz Migration 080: mutual post-care ratings
--
-- Each participant gives the other participant four focused ratings. The
-- existing overall rating remains the rounded average so helper discovery and
-- existing profile statistics keep working.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rating_helper_friendliness INT,
  ADD COLUMN IF NOT EXISTS rating_helper_reliability INT,
  ADD COLUMN IF NOT EXISTS rating_helper_animal_care INT,
  ADD COLUMN IF NOT EXISTS rating_helper_communication INT,
  ADD COLUMN IF NOT EXISTS rating_seeker_friendliness INT,
  ADD COLUMN IF NOT EXISTS rating_seeker_reliability INT,
  ADD COLUMN IF NOT EXISTS rating_seeker_animal_care INT,
  ADD COLUMN IF NOT EXISTS rating_seeker_communication INT;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_rating_helper_friendliness_check
    CHECK (rating_helper_friendliness IS NULL OR rating_helper_friendliness BETWEEN 1 AND 5),
  ADD CONSTRAINT bookings_rating_helper_reliability_check
    CHECK (rating_helper_reliability IS NULL OR rating_helper_reliability BETWEEN 1 AND 5),
  ADD CONSTRAINT bookings_rating_helper_animal_care_check
    CHECK (rating_helper_animal_care IS NULL OR rating_helper_animal_care BETWEEN 1 AND 5),
  ADD CONSTRAINT bookings_rating_helper_communication_check
    CHECK (rating_helper_communication IS NULL OR rating_helper_communication BETWEEN 1 AND 5),
  ADD CONSTRAINT bookings_rating_seeker_friendliness_check
    CHECK (rating_seeker_friendliness IS NULL OR rating_seeker_friendliness BETWEEN 1 AND 5),
  ADD CONSTRAINT bookings_rating_seeker_reliability_check
    CHECK (rating_seeker_reliability IS NULL OR rating_seeker_reliability BETWEEN 1 AND 5),
  ADD CONSTRAINT bookings_rating_seeker_animal_care_check
    CHECK (rating_seeker_animal_care IS NULL OR rating_seeker_animal_care BETWEEN 1 AND 5),
  ADD CONSTRAINT bookings_rating_seeker_communication_check
    CHECK (rating_seeker_communication IS NULL OR rating_seeker_communication BETWEEN 1 AND 5);

DROP FUNCTION IF EXISTS public.seeker_rate_helper(UUID, INT, TEXT);
CREATE OR REPLACE FUNCTION public.seeker_rate_helper(
  p_booking_id UUID,
  p_friendliness INT,
  p_reliability INT,
  p_animal_care INT,
  p_communication INT,
  p_review TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.seeker_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the seeker can rate the helper';
  END IF;
  IF v_booking.status <> 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed to rate';
  END IF;
  IF v_booking.rating_helper IS NOT NULL THEN
    RAISE EXCEPTION 'Helper already rated for this booking';
  END IF;
  IF p_friendliness NOT BETWEEN 1 AND 5
     OR p_reliability NOT BETWEEN 1 AND 5
     OR p_animal_care NOT BETWEEN 1 AND 5
     OR p_communication NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Every rating must be between 1 and 5';
  END IF;
  IF p_review IS NOT NULL AND char_length(BTRIM(p_review)) > 500 THEN
    RAISE EXCEPTION 'Review must be 500 characters or fewer';
  END IF;

  UPDATE public.bookings
  SET rating_helper = ROUND((p_friendliness + p_reliability + p_animal_care + p_communication) / 4.0)::INT,
      rating_helper_friendliness = p_friendliness,
      rating_helper_reliability = p_reliability,
      rating_helper_animal_care = p_animal_care,
      rating_helper_communication = p_communication,
      review_helper = NULLIF(BTRIM(p_review), ''),
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.helper_rate_seeker(UUID, INT, TEXT);
CREATE OR REPLACE FUNCTION public.helper_rate_seeker(
  p_booking_id UUID,
  p_friendliness INT,
  p_reliability INT,
  p_animal_care INT,
  p_communication INT,
  p_review TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the helper can rate the seeker';
  END IF;
  IF v_booking.status <> 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed to rate';
  END IF;
  IF v_booking.rating_seeker IS NOT NULL THEN
    RAISE EXCEPTION 'Seeker already rated for this booking';
  END IF;
  IF p_friendliness NOT BETWEEN 1 AND 5
     OR p_reliability NOT BETWEEN 1 AND 5
     OR p_animal_care NOT BETWEEN 1 AND 5
     OR p_communication NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Every rating must be between 1 and 5';
  END IF;
  IF p_review IS NOT NULL AND char_length(BTRIM(p_review)) > 500 THEN
    RAISE EXCEPTION 'Review must be 500 characters or fewer';
  END IF;

  UPDATE public.bookings
  SET rating_seeker = ROUND((p_friendliness + p_reliability + p_animal_care + p_communication) / 4.0)::INT,
      rating_seeker_friendliness = p_friendliness,
      rating_seeker_reliability = p_reliability,
      rating_seeker_animal_care = p_animal_care,
      rating_seeker_communication = p_communication,
      review_seeker = NULLIF(BTRIM(p_review), ''),
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.seeker_rate_helper(UUID, INT, INT, INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helper_rate_seeker(UUID, INT, INT, INT, INT, TEXT) TO authenticated;
