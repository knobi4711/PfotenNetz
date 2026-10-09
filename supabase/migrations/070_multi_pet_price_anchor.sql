-- PfotenNetz Migration 070: Anchor the total price of a multi-pet request
--
-- Every child row keeps the same displayed request price so the data remains
-- valid for EUR and PER_VISIT constraints. Position zero is settled by the
-- server; the other rows are completed without a second ledger movement.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_group_position INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bookings.booking_group_position IS
  'Stable zero-based position inside a multi-pet request; position zero is the request anchor.';

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
    ORDER BY booking_group_position, created_at, id
    FOR UPDATE
  LOOP
    IF (v_group_id IS NULL OR v_item.booking_group_position = 0)
      AND v_item.currency = 'KIEZ_HOURS'::public.currency
      AND v_item.price_kiez_hours > 0 THEN
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

GRANT EXECUTE ON FUNCTION public.helper_complete_booking(UUID) TO authenticated;
