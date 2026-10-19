-- PfotenNetz Migration 081: keep the legacy one-score rating RPCs
--
-- Older mobile clients may still call the original three-argument functions.
-- Keep those calls valid while new clients use the four-criterion overloads.

CREATE OR REPLACE FUNCTION public.seeker_rate_helper(
  p_booking_id UUID,
  p_rating INT,
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
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF p_review IS NOT NULL AND char_length(BTRIM(p_review)) > 500 THEN
    RAISE EXCEPTION 'Review must be 500 characters or fewer';
  END IF;

  UPDATE public.bookings
  SET rating_helper = p_rating,
      review_helper = NULLIF(BTRIM(p_review), ''),
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.helper_rate_seeker(
  p_booking_id UUID,
  p_rating INT,
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
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF p_review IS NOT NULL AND char_length(BTRIM(p_review)) > 500 THEN
    RAISE EXCEPTION 'Review must be 500 characters or fewer';
  END IF;

  UPDATE public.bookings
  SET rating_seeker = p_rating,
      review_seeker = NULLIF(BTRIM(p_review), ''),
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.seeker_rate_helper(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helper_rate_seeker(UUID, INT, TEXT) TO authenticated;
