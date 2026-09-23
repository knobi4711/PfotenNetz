-- PfotenNetz Database Migration 003: Bookings

CREATE TYPE booking_type AS ENUM ('walk', 'feeding', 'vacation', 'daycare');
CREATE TYPE booking_status AS ENUM ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');
CREATE TYPE key_handoff_type AS ENUM ('lockbox', 'personal', 'smartlock', 'neighbor');
CREATE TYPE currency AS ENUM ('EUR', 'KIEZ_HOURS');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  type booking_type NOT NULL,
  status booking_status NOT NULL DEFAULT 'requested',
  seeker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  helper_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  meeting_location GEOGRAPHY(POINT, 4326),
  meeting_address TEXT,
  key_handoff_type key_handoff_type,
  key_handoff_details JSONB,
  price_eur_cents INT NOT NULL DEFAULT 0,
  price_kiez_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  currency currency NOT NULL DEFAULT 'KIEZ_HOURS',
  timebank_credits_earned NUMERIC(6,2) NOT NULL DEFAULT 0,
  timebank_credits_spent NUMERIC(6,2) NOT NULL DEFAULT 0,
  rating_seeker INT CHECK (rating_seeker BETWEEN 1 AND 5),
  rating_helper INT CHECK (rating_helper BETWEEN 1 AND 5),
  review_seeker TEXT,
  review_helper TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_price_exclusive CHECK (
    (price_eur_cents > 0 AND price_kiez_hours = 0 AND currency = 'EUR') OR
    (price_eur_cents = 0 AND price_kiez_hours > 0 AND currency = 'KIEZ_HOURS') OR
    (price_eur_cents = 0 AND price_kiez_hours = 0 AND currency = 'KIEZ_HOURS')
  )
);

CREATE INDEX idx_bookings_seeker ON bookings(seeker_id);
CREATE INDEX idx_bookings_helper ON bookings(helper_id);
CREATE INDEX idx_bookings_pet ON bookings(pet_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time_range ON bookings(start_at, end_at);

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Read: Participants can read their bookings
CREATE POLICY "Participants read booking" ON bookings
  FOR SELECT USING (seeker_id = auth.uid() OR helper_id = auth.uid());

-- Create: Seeker can create booking
CREATE POLICY "Seeker create booking" ON bookings
  FOR INSERT WITH CHECK (seeker_id = auth.uid());

-- NO direct UPDATE policies for participants - all state changes via RPCs below
-- This prevents arbitrary column manipulation (price, pet_id, dates, etc.)

-- Admin full access via is_admin()
CREATE POLICY "Admin manage bookings" ON bookings
  FOR ALL USING (is_admin());

-- ============================================
-- Cross-table RLS Policies (moved here to avoid forward references)
-- These policies reference the bookings table which is now created
-- ============================================

-- Booking participants can see profile details (moved from 001_profiles.sql)
-- This policy on profiles references bookings table
CREATE POLICY "Booking participant profile details" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
      AND (b.seeker_id = profiles.id OR b.helper_id = profiles.id)
      AND b.status IN ('confirmed', 'in_progress', 'completed')
    )
  );

-- Helpers view pets of active bookings (moved from 002_pets.sql)
-- This policy on pets references bookings table
CREATE POLICY "Helpers view pets of active bookings" ON pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.pet_id = pets.id
      AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
      AND b.status IN ('confirmed', 'in_progress', 'completed')
    )
  );

-- ============================================
-- RPC Functions for controlled state transitions
-- Each function validates: auth.uid(), current status, allowed transition
-- Only modifies the specific columns needed for that transition
-- ============================================

-- Helper accepts a requested booking
CREATE OR REPLACE FUNCTION helper_accept_booking(p_booking_id UUID)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  -- Lock the booking row for update
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Validate: must be helper, status must be requested
  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned helper can accept this booking';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking must be in requested status to accept';
  END IF;

  -- Perform transition: requested -> confirmed
  UPDATE bookings
  SET status = 'confirmed',
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper rejects a requested booking
CREATE OR REPLACE FUNCTION helper_reject_booking(p_booking_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned helper can reject this booking';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking must be in requested status to reject';
  END IF;

  UPDATE bookings
  SET status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = NOW(),
      cancellation_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Seeker cancels their booking (requested or confirmed)
CREATE OR REPLACE FUNCTION seeker_cancel_booking(p_booking_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.seeker_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the seeker can cancel this booking';
  END IF;

  IF v_booking.status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'Booking can only be cancelled in requested or confirmed status';
  END IF;

  UPDATE bookings
  SET status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = NOW(),
      cancellation_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper starts a confirmed booking
CREATE OR REPLACE FUNCTION helper_start_booking(p_booking_id UUID)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the helper can start this booking';
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Booking must be confirmed to start';
  END IF;

  UPDATE bookings
  SET status = 'in_progress',
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper completes an in-progress booking
CREATE OR REPLACE FUNCTION helper_complete_booking(p_booking_id UUID)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the helper can complete this booking';
  END IF;

  IF v_booking.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Booking must be in_progress to complete';
  END IF;

  UPDATE bookings
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Seeker rates helper (only after completion, only once)
CREATE OR REPLACE FUNCTION seeker_rate_helper(p_booking_id UUID, p_rating INT, p_review TEXT DEFAULT NULL)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.seeker_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the seeker can rate the helper';
  END IF;

  IF v_booking.status <> 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed to rate';
  END IF;

  IF v_booking.rating_helper IS NOT NULL THEN
    RAISE EXCEPTION 'Helper already rated for this booking';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  UPDATE bookings
  SET rating_helper = p_rating,
      review_helper = p_review,
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper rates seeker (only after completion, only once)
CREATE OR REPLACE FUNCTION helper_rate_seeker(p_booking_id UUID, p_rating INT, p_review TEXT DEFAULT NULL)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the helper can rate the seeker';
  END IF;

  IF v_booking.status <> 'completed' THEN
    RAISE EXCEPTION 'Booking must be completed to rate';
  END IF;

  IF v_booking.rating_seeker IS NOT NULL THEN
    RAISE EXCEPTION 'Seeker already rated for this booking';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  UPDATE bookings
  SET rating_seeker = p_rating,
      review_seeker = p_review,
      updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute on all booking RPCs to authenticated users
GRANT EXECUTE ON FUNCTION helper_accept_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION helper_reject_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION seeker_cancel_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION helper_start_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION helper_complete_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seeker_rate_helper(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION helper_rate_seeker(UUID, INT, TEXT) TO authenticated;