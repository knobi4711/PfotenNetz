-- PfotenNetz Migration: Kiez-Hours credits for accounts with a negative balance
--
-- Problem: timebank_adjust() blocked any ledger entry whose resulting balance
-- was negative and whose type was not 'spent' or 'adjustment'. That also hit
-- 'earned' credits: a helper whose balance was already negative (e.g. -2.00)
-- could not receive the 1.00 hour for a completed booking, because
-- -2.00 + 1.00 = -1.00 < 0. helper_complete_booking() then failed with
-- "Insufficient timebank balance: -2.00 hours available, -1.00 requested"
-- and the booking could never be completed.
--
-- Fix: the guard now only applies to entries that actually reduce the balance.
--   'spent' and 'adjustment' may still go negative (unchanged business rule
--   from 018_timebank_booking_settlement.sql).
--   'earned', 'bonus' and positive 'transfer' entries are always accepted.
--   Negative 'bonus'/'transfer' entries still require sufficient funds.
--
-- Everything else (SECURITY DEFINER, lock, ledger row, balance_before/after,
-- totals, idempotency) is unchanged from 018_timebank_booking_settlement.sql.
-- CREATE OR REPLACE keeps ownership and the existing REVOKEs.

CREATE OR REPLACE FUNCTION public.timebank_adjust(
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
BEGIN
  -- Step 1: Ensure account exists (INSERT ... ON CONFLICT DO NOTHING)
  INSERT INTO timebank_accounts (user_id, balance_hours)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Step 2: Lock the account row and read current balance
  SELECT balance_hours INTO v_balance_before
  FROM timebank_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to create or lock timebank account for user %', p_user_id;
  END IF;

  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount_hours;

  -- Only debits may be rejected. Credits never fail, even when the current
  -- balance is negative, otherwise indebted users could never earn again.
  IF p_amount_hours < 0
    AND v_balance_after < 0
    AND p_type NOT IN ('spent', 'adjustment') THEN
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

-- Restore the grants from 010/018/019: internal callers (SECURITY DEFINER
-- functions) keep working, direct client access stays revoked.
REVOKE EXECUTE ON FUNCTION public.timebank_adjust(
  UUID, NUMERIC, timebank_tx_type, TEXT, UUID, TEXT, JSONB
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.timebank_adjust(
  UUID, NUMERIC, timebank_tx_type, TEXT, UUID, TEXT, JSONB
) FROM PUBLIC;
