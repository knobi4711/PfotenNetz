-- PfotenNetz Database Migration 007: Hazard Sightings (Gefahren-Sichtungen)
-- Additional sightings/confirmations of existing hazards by other users

CREATE TABLE hazard_sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  photo_url TEXT,
  description TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hazard_sightings_hazard ON hazard_sightings(hazard_id);
CREATE INDEX idx_hazard_sightings_reporter ON hazard_sightings(reporter_id);
CREATE INDEX idx_hazard_sightings_hazard_verified ON hazard_sightings(hazard_id, verified);
CREATE INDEX idx_hazard_sightings_location ON hazard_sightings USING GIST (location);

CREATE TRIGGER update_hazard_sightings_updated_at
  BEFORE UPDATE ON hazard_sightings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE hazard_sightings ENABLE ROW LEVEL SECURITY;

-- Reporter full access to own sightings
CREATE POLICY "Reporter full access own sightings" ON hazard_sightings
  FOR ALL USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());

-- Sightings readable by hazard reporter and nearby users (if hazard is active)
CREATE POLICY "Sightings readable by hazard reporter" ON hazard_sightings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hazards h
      WHERE h.id = hazard_sightings.hazard_id
      AND h.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Sightings readable nearby for active hazards" ON hazard_sightings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hazards h
      WHERE h.id = hazard_sightings.hazard_id
      AND h.status = 'active'
      AND h.expires_at > NOW()
      AND ST_DWithin(h.location, current_user_location(), h.radius_km * 1000)
    )
  );

-- Admin full access
CREATE POLICY "Admin manage hazard sightings" ON hazard_sightings
  FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE ON hazard_sightings TO authenticated;