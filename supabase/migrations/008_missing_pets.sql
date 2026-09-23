-- PfotenNetz Database Migration 008: Missing Pets (Vermisste Haustiere)
-- Community help for finding lost pets

CREATE TYPE missing_pet_status AS ENUM ('active', 'found', 'cancelled');

CREATE TABLE missing_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  last_seen_location GEOGRAPHY(POINT, 4326) NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  search_radius_km NUMERIC(4,2) NOT NULL DEFAULT 2.0 CHECK (search_radius_km > 0 AND search_radius_km <= 50),
  status missing_pet_status NOT NULL DEFAULT 'active',
  description TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  tasso_id TEXT,
  found_at TIMESTAMPTZ,
  found_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  found_location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_missing_pets_pet ON missing_pets(pet_id);
CREATE INDEX idx_missing_pets_reporter ON missing_pets(reporter_id);
CREATE INDEX idx_missing_pets_status ON missing_pets(status);
CREATE INDEX idx_missing_pets_active_location ON missing_pets USING GIST (last_seen_location)
  WHERE status = 'active';
CREATE INDEX idx_missing_pets_last_seen ON missing_pets(last_seen_at DESC);

CREATE TRIGGER update_missing_pets_updated_at
  BEFORE UPDATE ON missing_pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE missing_pets ENABLE ROW LEVEL SECURITY;

-- Reporter full access to own missing pet reports
CREATE POLICY "Reporter full access own missing pets" ON missing_pets
  FOR ALL USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());

-- Active missing pets readable by nearby users (within search radius)
CREATE POLICY "Active missing pets readable nearby" ON missing_pets
  FOR SELECT USING (
    status = 'active'
    AND ST_DWithin(last_seen_location, current_user_location(), search_radius_km * 1000)
  );

-- Pet owner can read missing pet report for their pet
CREATE POLICY "Pet owner reads missing pet" ON missing_pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pets p
      WHERE p.id = missing_pets.pet_id
      AND p.owner_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admin manage missing pets" ON missing_pets
  FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE ON missing_pets TO authenticated;