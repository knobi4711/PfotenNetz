-- PfotenNetz Migration 069: Multi-pet booking requests
--
-- A request for several pets is stored as several booking rows with the same
-- booking_group_id. The rows keep the existing booking workflow and ledger
-- model, while the UI can present them as one request. Requests created at
-- different times (or for different helpers) keep a NULL group and remain
-- independent.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_bookings_booking_group
  ON public.bookings(booking_group_id)
  WHERE booking_group_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.booking_group_id IS
  'Groups the booking rows created together for multiple pets; NULL means an independent request.';

-- A helper must be able to see the pets listed on a still-requested booking.
DROP POLICY IF EXISTS "Helpers view pets of active bookings" ON public.pets;
CREATE POLICY "Helpers view pets of active bookings" ON public.pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.pet_id = pets.id
      AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
      AND b.status IN ('requested', 'confirmed', 'in_progress', 'completed')
    )
  );

DROP POLICY IF EXISTS "Booking participant profile details" ON public.profiles;
CREATE POLICY "Booking participant profile details" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
      AND (b.seeker_id = profiles.id OR b.helper_id = profiles.id)
      AND b.status IN ('requested', 'confirmed', 'in_progress', 'completed')
    )
  );

-- All state transitions below operate on the whole group. The requested
-- booking ID remains the stable detail/deep-link target and is returned from
-- each function for compatibility with the existing client API.

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
  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned helper can accept this booking';
  END IF;
  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking must be in requested status to accept';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
      AND (b.helper_id IS DISTINCT FROM auth.uid() OR b.status <> 'requested')
  ) THEN
    RAISE EXCEPTION 'All pets in the request must still be available';
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_booking_id OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.helper_reject_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_group_id UUID;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned helper can reject this booking';
  END IF;
  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking must be in requested status to reject';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
      AND (b.helper_id IS DISTINCT FROM auth.uid() OR b.status <> 'requested')
  ) THEN
    RAISE EXCEPTION 'All pets in the request must still be available';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = NOW(),
      cancellation_reason = p_reason, updated_at = NOW()
  WHERE id = p_booking_id OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.seeker_cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
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
  IF v_booking.status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'Booking can only be cancelled in requested or confirmed status';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
      AND b.status NOT IN ('requested', 'confirmed')
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

CREATE OR REPLACE FUNCTION public.helper_start_booking(p_booking_id UUID)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_group_id UUID;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the helper can start this booking';
  END IF;
  IF v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Booking must be confirmed to start';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
      AND (b.helper_id IS DISTINCT FROM auth.uid() OR b.status <> 'confirmed')
  ) THEN
    RAISE EXCEPTION 'All pets in the request must be confirmed before starting';
  END IF;

  UPDATE public.bookings
  SET status = 'in_progress', updated_at = NOW()
  WHERE id = p_booking_id OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Completion settles each child row, but the multi-pet form stores the price
-- only on the first row. This makes the entered price the total request price
-- instead of charging it once per animal.
CREATE OR REPLACE FUNCTION public.helper_complete_booking(p_booking_id UUID)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_item public.bookings;
  v_group_id UUID;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the helper can complete this booking';
  END IF;
  IF v_booking.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Booking must be in_progress to complete';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
      AND (b.helper_id IS DISTINCT FROM auth.uid() OR b.status <> 'in_progress')
  ) THEN
    RAISE EXCEPTION 'All pets in the request must be in progress before completion';
  END IF;

  FOR v_item IN
    SELECT * FROM public.bookings
    WHERE id = p_booking_id OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id)
    ORDER BY created_at, id
    FOR UPDATE
  LOOP
    IF v_item.currency = 'KIEZ_HOURS'::public.currency AND v_item.price_kiez_hours > 0 THEN
      PERFORM public.timebank_adjust(
        v_item.helper_id, v_item.price_kiez_hours, 'earned', 'booking_earned',
        v_item.id, 'Kiez-Hours earned for booking ' || v_item.booking_number,
        jsonb_build_object('booking_id', v_item.id, 'booking_number', v_item.booking_number)
      );
      PERFORM public.timebank_adjust(
        v_item.seeker_id, -v_item.price_kiez_hours, 'spent', 'booking_spent',
        v_item.id, 'Kiez-Hours spent for booking ' || v_item.booking_number,
        jsonb_build_object('booking_id', v_item.id, 'booking_number', v_item.booking_number)
      );
      UPDATE public.bookings
      SET status = 'completed', timebank_credits_earned = v_item.price_kiez_hours,
          timebank_credits_spent = v_item.price_kiez_hours, updated_at = NOW()
      WHERE id = v_item.id;
    ELSE
      UPDATE public.bookings SET status = 'completed', updated_at = NOW() WHERE id = v_item.id;
    END IF;
  END LOOP;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.helper_accept_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helper_reject_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seeker_cancel_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helper_start_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.helper_complete_booking(UUID) TO authenticated;
