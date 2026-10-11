-- PfotenNetz Migration 073: Allow seekers to edit unconfirmed requests
--
-- Booking rows deliberately have no participant UPDATE policy. This RPC keeps
-- the same boundary as the other booking workflow operations and updates all
-- rows in a multi-pet request atomically.

CREATE OR REPLACE FUNCTION public.seeker_update_booking_request(
  p_booking_id UUID,
  p_type public.booking_type,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_meeting_address TEXT,
  p_currency public.currency,
  p_price_eur_cents INTEGER,
  p_price_kiez_hours NUMERIC,
  p_is_urgent BOOLEAN,
  p_care_notes TEXT,
  p_care_location TEXT
)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_group_id UUID;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.seeker_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the seeker can edit this booking';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking can only be edited before helper acceptance';
  END IF;

  v_group_id := v_booking.booking_group_id;

  -- Lock and validate every row before changing any of them. This prevents a
  -- grouped request from being edited partially while a helper accepts it.
  IF v_group_id IS NOT NULL THEN
    PERFORM 1
    FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
    FOR UPDATE;

    IF EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.booking_group_id = v_group_id
        AND (b.seeker_id IS DISTINCT FROM auth.uid() OR b.status <> 'requested')
    ) THEN
      RAISE EXCEPTION 'All pets in the request must still be editable';
    END IF;
  END IF;

  IF p_end_at IS NULL OR p_start_at IS NULL OR p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'Booking end must be after start';
  END IF;

  IF p_price_eur_cents < 0 OR p_price_kiez_hours < 0 THEN
    RAISE EXCEPTION 'Booking prices cannot be negative';
  END IF;

  IF p_currency::TEXT IN ('EUR', 'PER_VISIT')
     AND (p_price_eur_cents <= 0 OR p_price_kiez_hours <> 0) THEN
    RAISE EXCEPTION 'Euro bookings require a positive euro price';
  END IF;

  IF p_currency = 'KIEZ_HOURS'::public.currency
     AND (p_price_eur_cents <> 0 OR p_price_kiez_hours < 0) THEN
    RAISE EXCEPTION 'Kiez-Hours bookings require a Kiez-Hours price';
  END IF;

  IF p_care_location NOT IN ('at_owner_home', 'at_owner_home_live_in', 'at_helper_home') THEN
    RAISE EXCEPTION 'Invalid care location';
  END IF;

  IF p_care_notes IS NOT NULL AND char_length(p_care_notes) > 2000 THEN
    RAISE EXCEPTION 'Care notes may not exceed 2000 characters';
  END IF;

  UPDATE public.bookings
  SET type = p_type,
      start_at = p_start_at,
      end_at = p_end_at,
      meeting_address = NULLIF(BTRIM(p_meeting_address), ''),
      currency = p_currency,
      price_eur_cents = p_price_eur_cents,
      price_kiez_hours = p_price_kiez_hours,
      is_urgent = p_is_urgent,
      care_notes = NULLIF(BTRIM(p_care_notes), ''),
      care_location = p_care_location,
      updated_at = NOW()
  WHERE id = p_booking_id
     OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.seeker_update_booking_request(
  UUID, public.booking_type, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, public.currency,
  INTEGER, NUMERIC, BOOLEAN, TEXT, TEXT
) TO authenticated;
