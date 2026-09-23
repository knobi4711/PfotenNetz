-- PfotenNetz Database Migration 012: Helper Availabilities (Helper-Verfügbarkeiten)
-- Recurring availability schedules for helpers

CREATE TABLE helper_availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),
  booking_types TEXT[] NOT NULL DEFAULT '{}', -- subset of booking_type enum values
  max_distance_km NUMERIC(4,1) NOT NULL DEFAULT 5.0 CHECK (max_distance_km > 0 AND max_distance_km <= 50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (helper_id, day_of_week, start_time, end_time)
);

CREATE INDEX idx_helper_availabilities_helper ON helper_availabilities(helper_id);
CREATE INDEX idx_helper_availabilities_day ON helper_availabilities(day_of_week);
CREATE INDEX idx_helper_availabilities_active ON helper_availabilities(helper_id) WHERE is_active = true;

CREATE TRIGGER update_helper_availabilities_updated_at
  BEFORE UPDATE ON helper_availabilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE helper_availabilities ENABLE ROW LEVEL SECURITY;

-- Helper manages own availabilities
CREATE POLICY "Helper manages own availabilities" ON helper_availabilities
  FOR ALL USING (helper_id = auth.uid()) WITH CHECK (helper_id = auth.uid());

-- Active availabilities readable by seekers looking for helpers (via RPC find_nearby_helpers)
-- No direct SELECT policy for public - accessed via SECURITY DEFINER function
-- Seekers don't directly query this table; RPC handles it with proper filtering

-- Admin full access
CREATE POLICY "Admin manage helper availabilities" ON helper_availabilities
  FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON helper_availabilities TO authenticated;