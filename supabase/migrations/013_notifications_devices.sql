-- PfotenNetz Database Migration 013: Notifications & Devices
-- Push notifications and device management

CREATE TYPE notification_type AS ENUM (
  'chat_message',
  'booking_request',
  'booking_confirmed',
  'booking_cancelled',
  'tracking_started',
  'tracking_milestone',
  'tracking_ended',
  'hazard_alert',
  'hazard_resolved',
  'missing_pet_alert',
  'missing_pet_found',
  'community_event',
  'verification_update',
  'timebank_update',
  'system'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  push_sent BOOLEAN NOT NULL DEFAULT false,
  push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_type_time ON notifications(user_id, type, created_at DESC);
CREATE INDEX idx_notifications_push_pending ON notifications(user_id, push_sent, created_at)
  WHERE push_sent = false;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  push_token TEXT UNIQUE,
  push_token_updated_at TIMESTAMPTZ,
  app_version TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_user_active ON devices(user_id, is_active);
CREATE INDEX idx_devices_push_token ON devices(push_token) WHERE push_token IS NOT NULL;

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
-- User full access to own notifications
CREATE POLICY "User full access own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- System/Admin can insert notifications for any user (via RPC/service role)
-- No direct INSERT policy for users - done via RPC

-- Admin full access
CREATE POLICY "Admin manage notifications" ON notifications
  FOR ALL USING (is_admin());

-- Devices Policies
-- User manages own devices
CREATE POLICY "User manages own devices" ON devices
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin manage devices" ON devices
  FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON devices TO authenticated;