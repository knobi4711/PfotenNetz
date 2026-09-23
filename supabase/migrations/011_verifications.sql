-- PfotenNetz Database Migration 011: Verifications (Verifizierungen)
-- ID documents, liability insurance, guarantor, pet owner proof

CREATE TYPE verification_type AS ENUM (
  'id_document',
  'liability_insurance',
  'guarantor',
  'pet_owner_proof'
);

CREATE TYPE verification_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type verification_type NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  storage_paths TEXT[] NOT NULL DEFAULT '{}',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verifications_user ON verifications(user_id);
CREATE INDEX idx_verifications_type ON verifications(type);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_user_status ON verifications(user_id, status);
CREATE INDEX idx_verifications_status_expires ON verifications(status, expires_at)
  WHERE status IN ('pending', 'approved');

CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- User full access to own verifications
CREATE POLICY "User full access own verifications" ON verifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin manage verifications" ON verifications
  FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE ON verifications TO authenticated;