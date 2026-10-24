-- Separate helper interest from owner confirmation and keep open requests local.
-- Precise address/coordinates are handled in a private table in the follow-up
-- address migration; this migration establishes the matching/state boundary.

CREATE OR REPLACE FUNCTION public.helper_matches_open_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking public.bookings;
  v_helper public.profiles;
  v_seeker public.profiles;
BEGIN
  IF NOT public.is_verified_helper() THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;
  IF NOT FOUND OR v_booking.status <> 'requested' OR v_booking.helper_id IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_helper FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO v_seeker FROM public.profiles WHERE id = v_booking.seeker_id;
  IF v_helper.id IS NULL OR v_seeker.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- A matching postal area is a deliberate local-area subscription. The
  -- distance fallback is based on the seeker's configured neighbourhood radius.
  RETURN (
    v_helper.postal_code IS NOT NULL
    AND v_seeker.postal_code IS NOT NULL
    AND v_helper.postal_code = v_seeker.postal_code
  ) OR (
    v_helper.location IS NOT NULL
    AND v_seeker.location IS NOT NULL
    AND ST_DWithin(
      v_helper.location,
      v_seeker.location,
      v_seeker.kiez_radius_km * 1000
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.helper_matches_open_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.helper_matches_open_booking(UUID) TO authenticated;

DROP POLICY IF EXISTS "Participants and helpers read booking" ON public.bookings;
CREATE POLICY "Participants and local helpers read booking" ON public.bookings
  FOR SELECT USING (
    seeker_id = auth.uid()
    OR helper_id = auth.uid()
    OR (
      status = 'requested'
      AND helper_id IS NULL
      AND public.helper_matches_open_booking(id)
    )
  );

DROP POLICY IF EXISTS "Helpers view pets of active bookings" ON public.pets;
CREATE POLICY "Helpers view pets of active bookings" ON public.pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.pet_id = pets.id
        AND (
          b.seeker_id = auth.uid()
          OR b.helper_id = auth.uid()
          OR (
            b.status = 'requested'
            AND b.helper_id IS NULL
            AND public.helper_matches_open_booking(b.id)
          )
        )
        AND b.status IN ('requested', 'awaiting_seeker', 'confirmed', 'in_progress', 'completed')
    )
  );

CREATE OR REPLACE FUNCTION public.helper_accept_booking(p_booking_id UUID)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_group_id UUID;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking must be in requested status to accept';
  END IF;
  IF v_booking.end_at <= NOW() THEN RAISE EXCEPTION 'Booking has expired'; END IF;
  IF v_booking.seeker_id = auth.uid() THEN
    RAISE EXCEPTION 'The seeker cannot accept their own booking';
  END IF;
  IF NOT public.helper_matches_open_booking(p_booking_id) THEN
    RAISE EXCEPTION 'Only a local verified helper can accept this booking';
  END IF;
  IF v_booking.helper_id IS NOT NULL AND v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This booking has already been taken';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL THEN
    PERFORM 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id FOR UPDATE;
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_group_id = v_group_id
        AND (
          b.status <> 'requested'
          OR b.end_at <= NOW()
          OR (b.helper_id IS NOT NULL AND b.helper_id IS DISTINCT FROM auth.uid())
        )
    ) THEN
      RAISE EXCEPTION 'All pets in the request must still be available';
    END IF;
  END IF;

  UPDATE public.bookings
  SET helper_id = auth.uid(), status = 'awaiting_seeker', updated_at = NOW()
  WHERE id = p_booking_id OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.seeker_confirm_helper(p_booking_id UUID)
RETURNS public.bookings AS $$
DECLARE v_booking public.bookings;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.seeker_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the seeker can confirm a helper';
  END IF;
  IF v_booking.status <> 'awaiting_seeker' OR v_booking.helper_id IS NULL THEN
    RAISE EXCEPTION 'There is no helper awaiting confirmation';
  END IF;
  UPDATE public.bookings SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_booking_id OR (v_booking.booking_group_id IS NOT NULL AND booking_group_id = v_booking.booking_group_id);
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.seeker_reject_helper(p_booking_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS public.bookings AS $$
DECLARE v_booking public.bookings;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.seeker_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the seeker can reject a helper';
  END IF;
  IF v_booking.status <> 'awaiting_seeker' OR v_booking.helper_id IS NULL THEN
    RAISE EXCEPTION 'There is no helper awaiting confirmation';
  END IF;
  -- The next applicant must not inherit the rejected helper's private chat.
  DELETE FROM public.messages m
  USING public.bookings b
  WHERE m.booking_id = b.id
    AND (b.id = p_booking_id OR (v_booking.booking_group_id IS NOT NULL AND b.booking_group_id = v_booking.booking_group_id));
  UPDATE public.bookings
  SET helper_id = NULL, status = 'requested',
      cancellation_reason = NULLIF(BTRIM(p_reason), ''), updated_at = NOW()
  WHERE id = p_booking_id OR (v_booking.booking_group_id IS NOT NULL AND booking_group_id = v_booking.booking_group_id);
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.seeker_cancel_booking(p_booking_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_group_id UUID;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.seeker_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the seeker can cancel this booking';
  END IF;
  IF v_booking.status NOT IN ('requested', 'awaiting_seeker', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled in its current status';
  END IF;
  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
      AND b.status NOT IN ('requested', 'awaiting_seeker', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'All pets in the request must still be cancellable';
  END IF;
  UPDATE public.bookings
  SET status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = NOW(),
      cancellation_reason = p_reason, updated_at = NOW()
  WHERE id = p_booking_id OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.seeker_confirm_helper(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seeker_reject_helper(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seeker_confirm_helper(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seeker_reject_helper(UUID, TEXT) TO authenticated;

-- Applicants can coordinate in the booking chat while awaiting the owner's decision.
DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
        AND b.status IN ('awaiting_seeker', 'confirmed', 'in_progress', 'completed')
    )
  );
