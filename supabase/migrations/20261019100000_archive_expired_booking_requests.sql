-- PfotenNetz Migration 079: do not expose expired open booking requests
--
-- The clients use end_at to place every ended request in the archive. Keep the
-- database policy and the claim RPC consistent so an unassigned request cannot
-- be discovered or claimed after its care period has ended.

DROP POLICY IF EXISTS "Participants and helpers read booking" ON public.bookings;
CREATE POLICY "Participants and helpers read booking" ON public.bookings
  FOR SELECT USING (
    seeker_id = auth.uid()
    OR helper_id = auth.uid()
    OR (
      status = 'requested'
      AND helper_id IS NULL
      AND end_at > NOW()
      AND public.is_verified_helper()
    )
  );

DROP POLICY IF EXISTS "Helpers view pets of active bookings" ON public.pets;
DROP POLICY IF EXISTS "Helpers view pets of booking requests" ON public.pets;
CREATE POLICY "Helpers view pets of booking requests" ON public.pets
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
            AND b.end_at > NOW()
            AND public.is_verified_helper()
          )
        )
        AND b.status IN ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking must be in requested status to accept';
  END IF;

  IF v_booking.end_at <= NOW() THEN
    RAISE EXCEPTION 'Booking has expired';
  END IF;

  IF v_booking.seeker_id = auth.uid() THEN
    RAISE EXCEPTION 'The seeker cannot accept their own booking';
  END IF;

  IF NOT public.is_verified_helper() THEN
    RAISE EXCEPTION 'Only a verified helper can accept this booking';
  END IF;

  IF v_booking.helper_id IS NOT NULL AND v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned helper can accept this booking';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL THEN
    PERFORM 1
    FROM public.bookings b
    WHERE b.booking_group_id = v_group_id
    FOR UPDATE;

    IF EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.booking_group_id = v_group_id
        AND (
          b.status <> 'requested'
          OR (b.helper_id IS NOT NULL AND b.helper_id IS DISTINCT FROM auth.uid())
          OR b.end_at <= NOW()
        )
    ) THEN
      RAISE EXCEPTION 'All pets in the request must still be available';
    END IF;
  END IF;

  UPDATE public.bookings
  SET helper_id = auth.uid(),
      status = 'confirmed',
      updated_at = NOW()
  WHERE id = p_booking_id
     OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
