-- PfotenNetz Database Migration 005: Messages
-- Chat messages for bookings

CREATE TYPE message_type AS ENUM ('text', 'image', 'location', 'voice', 'system');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_booking ON messages(booking_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_booking_unread ON messages(booking_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_messages_sender_time ON messages(sender_id, created_at DESC);

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participants can read messages in their bookings
CREATE POLICY "Participants read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id
      AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );

-- Participants can send messages in their bookings
CREATE POLICY "Participants send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id
      AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
      AND b.status IN ('confirmed', 'in_progress', 'completed')
    )
  );

-- System messages can be inserted by system (service role via RPC)
-- No direct INSERT policy for system type - handled via RPC if needed

-- Admin full access
CREATE POLICY "Admin manage messages" ON messages
  FOR ALL USING (is_admin());

GRANT SELECT, INSERT ON messages TO authenticated;