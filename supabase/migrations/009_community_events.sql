-- PfotenNetz Database Migration 009: Community Events & Participants
-- Group walks, playdates, meetups, swap meets, training events

CREATE TYPE event_type AS ENUM (
  'group_walk',
  'playdate',
  'meetup',
  'swap_meet',
  'training',
  'other'
);

CREATE TABLE community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type event_type NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_participants INT CHECK (max_participants IS NULL OR max_participants > 0),
  is_public BOOLEAN NOT NULL DEFAULT true,
  required_trust_level TEXT NOT NULL DEFAULT 'basic' CHECK (required_trust_level IN ('basic', 'bronze', 'silver', 'gold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_events_organizer ON community_events(organizer_id);
CREATE INDEX idx_community_events_type ON community_events(type);
CREATE INDEX idx_community_events_time_public ON community_events(starts_at, is_public);
CREATE INDEX idx_community_events_location ON community_events USING GIST (location);
CREATE INDEX idx_community_events_trust_level ON community_events(required_trust_level);

CREATE TRIGGER update_community_events_updated_at
  BEFORE UPDATE ON community_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

CREATE TRIGGER update_event_participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Community Events Policies
-- Organizer full access
CREATE POLICY "Organizer full access events" ON community_events
  FOR ALL USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());

-- Public events readable by users with sufficient trust level
-- trust_level hierarchy: basic < bronze < silver < gold
-- required_trust_level = 'basic'  -> all users (handled by first condition)
-- required_trust_level = 'bronze' -> bronze, silver, gold
-- required_trust_level = 'silver' -> silver, gold
-- required_trust_level = 'gold'   -> gold only
CREATE POLICY "Public events readable" ON community_events
  FOR SELECT USING (
    is_public = true
    AND (
      required_trust_level = 'basic'
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
          (required_trust_level = 'bronze' AND p.trust_level IN ('bronze', 'silver', 'gold'))
          OR (required_trust_level = 'silver' AND p.trust_level IN ('silver', 'gold'))
          OR (required_trust_level = 'gold' AND p.trust_level = 'gold')
        )
      )
    )
  );

-- Private events readable only by organizer and participants
CREATE POLICY "Private events readable by participants" ON community_events
  FOR SELECT USING (
    is_public = false
    AND (
      organizer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM event_participants ep
        WHERE ep.event_id = community_events.id
        AND ep.user_id = auth.uid()
        AND ep.status = 'going'
      )
    )
  );

-- Admin full access
CREATE POLICY "Admin manage community events" ON community_events
  FOR ALL USING (is_admin());

-- Event Participants Policies
-- Users manage their own participation
CREATE POLICY "Users manage own participation" ON event_participants
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Organizer can view all participants for their events
CREATE POLICY "Organizer views participants" ON event_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_events ce
      WHERE ce.id = event_participants.event_id
      AND ce.organizer_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admin manage event participants" ON event_participants
  FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON community_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_participants TO authenticated;