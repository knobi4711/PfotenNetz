-- PfotenNetz Database Migration 004: Tracking Sessions & Points

CREATE TABLE tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_distance_meters INT NOT NULL DEFAULT 0,
  total_duration_seconds INT NOT NULL DEFAULT 0,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  business_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_booking ON tracking_sessions(booking_id);

CREATE TRIGGER update_tracking_sessions_updated_at
  BEFORE UPDATE ON tracking_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE tracking_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_meters NUMERIC(6,2),
  speed_mps NUMERIC(6,2),
  heading_degrees SMALLINT,
  altitude_meters NUMERIC(8,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_batched BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_tracking_points_session_time ON tracking_points(session_id, recorded_at);
CREATE INDEX idx_tracking_points_received ON tracking_points(received_at) WHERE is_batched = false;

ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read tracking session" ON tracking_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = tracking_sessions.booking_id
      AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );

CREATE POLICY "Helper manage tracking session" ON tracking_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = tracking_sessions.booking_id
      AND b.helper_id = auth.uid()
      AND b.status IN ('confirmed', 'in_progress')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = tracking_sessions.booking_id
      AND b.helper_id = auth.uid()
    )
  );

CREATE POLICY "Participants read tracking points" ON tracking_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tracking_sessions ts
      JOIN bookings b ON b.id = ts.booking_id
      WHERE ts.id = tracking_points.session_id
      AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );

CREATE POLICY "Helper insert tracking points" ON tracking_points
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tracking_sessions ts
      JOIN bookings b ON b.id = ts.booking_id
      WHERE ts.id = tracking_points.session_id
      AND b.helper_id = auth.uid()
      AND b.status = 'in_progress'
      AND ts.ended_at IS NULL
    )
  );