-- PfotenNetz Database Migration 010: Timebank (Zeitbank)

CREATE TYPE timebank_tx_type AS ENUM ('earned', 'spent', 'bonus', 'adjustment', 'transfer');

CREATE TABLE timebank_accounts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_earned_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_spent_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_timebank_accounts_updated_at
  BEFORE UPDATE ON timebank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE timebank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type timebank_tx_type NOT NULL,
  amount_hours NUMERIC(6,2) NOT NULL,
  balance_before_hours NUMERIC(8,2) NOT NULL,
  balance_after_hours NUMERIC(8,2) NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Idempotency: unique constraint on reference prevents duplicate transactions from retries
  UNIQUE (reference_type, reference_id)
);

CREATE INDEX idx_timebank_tx_user_time ON timebank_transactions(user_id, created_at DESC);
CREATE INDEX idx_timebank_tx_reference ON timebank_transactions(reference_type, reference_id);

ALTER TABLE timebank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timebank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own account" ON timebank_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users view own transactions" ON timebank_transactions
  FOR SELECT USING (user_id = auth.uid());

-- NO INSERT/UPDATE/DELETE policies for clients - ledger is append-only via RPC
-- Admin can manage via is_admin()
CREATE POLICY "Admin manage timebank" ON timebank_accounts
  FOR ALL USING (is_admin());

CREATE POLICY "Admin manage timebank transactions" ON timebank_transactions
  FOR ALL USING (is_admin());

-- ============================================
-- Timebank adjustment function (Server-side only via RPC)
-- Race-condition-safe: uses two-step INSERT + SELECT FOR UPDATE
-- Idempotent: unique constraint on (reference_type, reference_id)
-- SECURITY DEFINER with fixed search_path
-- ============================================
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

  -- Prevent negative balance (except for adjustments)
  IF v_balance_after < 0 AND p_type <> 'adjustment' THEN
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

-- Grant execute to authenticated users (Edge Functions call this via service role)
GRANT EXECUTE ON FUNCTION timebank_adjust(
  UUID, NUMERIC, timebank_tx_type, TEXT, UUID, TEXT, JSONB
) TO authenticated;