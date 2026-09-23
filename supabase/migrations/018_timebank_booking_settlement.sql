-- PfotenNetz Database Migration 018: Timebank booking settlement
--
-- Connects completed KIEZ_HOURS bookings with the timebank ledger.
-- Does NOT modify any earlier migration; only CREATE OR REPLACE on the
-- two functions named below, plus one REVOKE.
--
-- Touched objects (and nothing else):
--   1. timebank_adjust(...)  -> guard relaxed: negative balance allowed for 'spent'
--   2. REVOKE EXECUTE ON FUNCTION timebank_adjust(...) FROM authenticated
--   3. helper_complete_booking(UUID) -> atomic timebank settlement for KIEZ_HOURS bookings

-- ============================================================================
-- 1. timebank_adjust: allow negative balances for 'spent'
-- ============================================================================
-- Business rule: a seeker may complete a KIEZ_HOURS booking even with
-- insufficient funds, so the balance may go negative on 'spent'.
-- No 'adjustment' workaround is used; actual consumption is booked as 'spent'.
-- Everything else (SECURITY DEFINER, race-safe lock, ledger row,
-- balance_before/after, totals, idempotency) is unchanged from 010_timebank.sql.
CREATE OR REPLACE FUNCTION timebank_adjust(
  p_user_id UUID,
  p_amount_hours NUMERIC(6,2),
  p_type timebank_tx_type,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS timebank_transactions AS $$
DECLARE
  v_balance_before NUMERIC(8,2);
  v_balance_after NUMERIC(8,2);
  v_tx timebank_transactions;
  v_account_exists BOOLEAN;
BEGIN
  -- Step 1: Ensure account exists (INSERT ... ON CONFLICT DO NOTHING)
  -- This does NOT return the balance, just ensures row exists
  INSERT INTO timebank_accounts (user_id, balance_hours)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Step 2: Lock the account row and read current balance
  SELECT balance_hours INTO v_balance_before
  FROM timebank_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Should always be found now (created above if not exists)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to create or lock timebank account for user %', p_user_id;
  END IF;

  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount_hours;

  -- Negative balances are allowed for 'spent' (seeker may go negative)
  -- and for 'adjustment' (manual corrections). All other types still
  -- require a sufficient balance.
  IF v_balance_after < 0 AND p_type NOT IN ('adjustment', 'spent') THEN
    RAISE EXCEPTION 'Insufficient timebank balance: % hours available, % requested',
      v_balance_before, -p_amount_hours;
  END IF;

  -- Step 3: Update account balances
  UPDATE timebank_accounts
  SET balance_hours = v_balance_after,
      total_earned_hours = total_earned_hours + GREATEST(p_amount_hours, 0),
      total_spent_hours = total_spent_hours + GREATEST(-p_amount_hours, 0),
      last_transaction_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Step 4: Insert transaction record (idempotent via unique constraint)
  -- ON CONFLICT DO NOTHING handles retries gracefully
  INSERT INTO timebank_transactions (
    user_id, type, amount_hours,
    balance_before_hours, balance_after_hours,
    reference_type, reference_id, description, metadata, created_by
  ) VALUES (
    p_user_id, p_type, p_amount_hours,
    v_balance_before, v_balance_after,
    p_reference_type, p_reference_id, p_description, p_metadata, COALESCE(auth.uid(), p_user_id)
  )
  ON CONFLICT (reference_type, reference_id) DO NOTHING
  RETURNING * INTO v_tx;

  -- If transaction already existed (idempotent retry), fetch it
  IF v_tx IS NULL THEN
    SELECT * INTO v_tx
    FROM timebank_transactions
    WHERE reference_type = p_reference_type
      AND reference_id = p_reference_id;
  END IF;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. Revoke direct client access to timebank_adjust
-- ============================================================================
-- Signature mirrors the GRANT from 010_timebank.sql exactly, so the REVOKE
-- hits the same function and nothing else. The ledger stays append-only via
-- privileged RPCs: SECURITY DEFINER functions (e.g. helper_complete_booking
-- below) can still call timebank_adjust internally; plain authenticated
-- users can no longer mint or move hours via direct RPC use.
REVOKE EXECUTE ON FUNCTION timebank_adjust(
  UUID, NUMERIC, timebank_tx_type, TEXT, UUID, TEXT, JSONB
) FROM authenticated;

-- The default PostgreSQL grant gives EXECUTE on new functions to PUBLIC
-- (which includes anon and authenticated via PostgREST RPC). Revoking only
-- FROM authenticated would therefore leave direct client access intact.
-- This additional REVOKE closes the PUBLIC path as well. Internal calls
-- from SECURITY DEFINER functions (owner context) are unaffected.
REVOKE EXECUTE ON FUNCTION timebank_adjust(
  UUID, NUMERIC, timebank_tx_type, TEXT, UUID, TEXT, JSONB
) FROM PUBLIC;

-- ============================================================================
-- 3. helper_complete_booking: atomic timebank settlement
-- ============================================================================
-- For currency = 'KIEZ_HOURS' AND price_kiez_hours > 0, completing a booking
-- atomically (single transaction, full rollback on any error):
--   helper: +price_kiez_hours, type 'earned', ('booking_earned', booking.id)
--   seeker: -price_kiez_hours, type 'spent',  ('booking_spent', booking.id)
--   bookings.timebank_credits_earned/spent mirrored from price_kiez_hours
--   bookings.status = 'completed'
-- EUR bookings (or price 0): no ledger movement, mirror fields stay 0.
-- Idempotency: the status guard ('in_progress' required) prevents a second
-- normal completion; ledger references are never NULL.
CREATE OR REPLACE FUNCTION helper_complete_booking(p_booking_id UUID)
RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  -- 1. Lock the booking row for update
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- 2. Guards (unchanged)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the helper can complete this booking';
  END IF;

  IF v_booking.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Booking must be in_progress to complete';
  END IF;

  -- 3. Timebank settlement for priced KIEZ_HOURS bookings
  IF v_booking.currency = 'KIEZ_HOURS'::currency AND v_booking.price_kiez_hours > 0 THEN
    -- Helper earns the agreed Kiez-Hours
    PERFORM timebank_adjust(
      v_booking.helper_id,
      v_booking.price_kiez_hours,
      'earned',
      'booking_earned',
      v_booking.id,
      'Kiez-Hours earned for booking ' || v_booking.booking_number,
      jsonb_build_object('booking_id', v_booking.id, 'booking_number', v_booking.booking_number)
    );

    -- Seeker spends the agreed Kiez-Hours (balance may go negative)
    PERFORM timebank_adjust(
      v_booking.seeker_id,
      -v_booking.price_kiez_hours,
      'spent',
      'booking_spent',
      v_booking.id,
      'Kiez-Hours spent for booking ' || v_booking.booking_number,
      jsonb_build_object('booking_id', v_booking.id, 'booking_number', v_booking.booking_number)
    );

    UPDATE bookings
    SET status = 'completed',
        timebank_credits_earned = v_booking.price_kiez_hours,
        timebank_credits_spent = v_booking.price_kiez_hours,
        updated_at = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;
  ELSE
    -- 4. EUR (or free) bookings: status only, no ledger movement
    UPDATE bookings
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;
  END IF;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-issue the pre-existing grant (unchanged access, idempotent).
GRANT EXECUTE ON FUNCTION helper_complete_booking(UUID) TO authenticated;
