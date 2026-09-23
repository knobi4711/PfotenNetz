-- PfotenNetz Database Migration 015: Realtime Publications

-- Enable realtime for tables that need live updates

ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE hazards;
ALTER PUBLICATION supabase_realtime ADD TABLE tracking_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE timebank_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE community_events;
ALTER PUBLICATION supabase_realtime ADD TABLE missing_pets;

-- For tracking_points, only publish the latest position (not all points)
-- Use a view or filter for live position

CREATE OR REPLACE FUNCTION tracking_live_position()
RETURNS TABLE (
  session_id UUID,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_meters NUMERIC(6,2),
  speed_mps NUMERIC(6,2),
  heading_degrees SMALLINT,
  recorded_at TIMESTAMPTZ
) AS $$
  SELECT DISTINCT ON (session_id)
    session_id,
    latitude,
    longitude,
    accuracy_meters,
    speed_mps,
    heading_degrees,
    recorded_at
  FROM tracking_points
  WHERE received_at > NOW() - INTERVAL '5 minutes'
  ORDER BY session_id, received_at DESC;
$$ LANGUAGE sql STABLE;

-- Note: Realtime on views not directly supported
-- Use tracking_sessions with broadcast for live position