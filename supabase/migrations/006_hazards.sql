-- PfotenNetz Database Migration 006: Hazards (Gefahrenmeldungen)
-- Community-reported hazards like poison bait, glass shards, wasp nests, etc.

CREATE TYPE hazard_type AS ENUM (
  'poison_bait',
  'glass_shards',
  'wasp_nest',
  'aggressive_dog',
  'trap',
  'other'
);

CREATE TYPE hazard_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE hazard_status AS ENUM (
  'draft',
  'pending_review',
  'active',
  'resolved',
  'expired',
  'rejected'
);

CREATE TABLE hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_number TEXT UNIQUE NOT NULL,
  type hazard_type NOT NULL,
  severity hazard_severity NOT NULL DEFAULT 'medium',
  status hazard_status NOT NULL DEFAULT 'draft',
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT,
  radius_km NUMERIC(4,2) NOT NULL DEFAULT 0.5 CHECK (radius_km > 0 AND radius_km <= 10),
  description TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  notify_count INT NOT NULL DEFAULT 0,
  karma_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hazards_reporter ON hazards(reporter_id);
CREATE INDEX idx_hazards_status ON hazards(status);
CREATE INDEX idx_hazards_type ON hazards(type);
CREATE INDEX idx_hazards_location ON hazards USING GIST (location);
-- Partial index for active hazards (expires_at check done at query time;
-- NOW() is not IMMUTABLE and cannot be used in index predicates)
CREATE INDEX idx_hazards_active_location ON hazards USING GIST (location)
  WHERE status = 'active';
CREATE INDEX idx_hazards_expires ON hazards(expires_at) WHERE status IN ('active', 'pending_review');

CREATE TRIGGER update_hazards_updated_at
  BEFORE UPDATE ON hazards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;

-- Reporter full access to own hazards
CREATE POLICY "Reporter full access own hazards" ON hazards
  FOR ALL USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());

-- Active hazards readable by nearby users (within radius)
CREATE POLICY "Active hazards readable nearby" ON hazards
  FOR SELECT USING (
    status = 'active'
    AND expires_at > NOW()
    AND ST_DWithin(location, current_user_location(), radius_km * 1000)
  );

-- Pending review hazards readable by reporters and admins
CREATE POLICY "Pending hazards readable by reporter" ON hazards
  FOR SELECT USING (
    status = 'pending_review'
    AND reporter_id = auth.uid()
  );

-- Admin full access
CREATE POLICY "Admin manage hazards" ON hazards
  FOR ALL USING (is_admin());

-- Draft hazards only visible to reporter
CREATE POLICY "Draft hazards readable by reporter" ON hazards
  FOR SELECT USING (status = 'draft' AND reporter_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON hazards TO authenticated;