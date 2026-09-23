-- PfotenNetz Database Migration 001: Profiles
-- References auth.users as single source of truth

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'helper', 'admin')),
  trust_level TEXT NOT NULL DEFAULT 'basic' CHECK (trust_level IN ('basic', 'bronze', 'silver', 'gold')),
  kiez_radius_km NUMERIC(4,1) NOT NULL DEFAULT 1.5 CHECK (kiez_radius_km IN (0.5, 1.0, 1.5, 3.0)),
  location GEOGRAPHY(POINT, 4326),
  location_updated_at TIMESTAMPTZ,
  notification_prefs JSONB NOT NULL DEFAULT '{
    "push_enabled": true,
    "email_enabled": true,
    "chat_messages": true,
    "booking_updates": true,
    "hazard_alerts": true,
    "community_posts": false
  }'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  language TEXT NOT NULL DEFAULT 'de',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_location ON profiles USING GIST (location);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_trust_level ON profiles(trust_level);

-- Trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper: Get current user's location for RLS policies
-- Uses SECURITY DEFINER to avoid RLS recursion when called from policies
-- DEFINED HERE (after profiles table exists) because it references profiles
CREATE OR REPLACE FUNCTION current_user_location()
RETURNS GEOGRAPHY(POINT, 4326) AS $$
  SELECT location FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- SECURITY DEFINER function to check admin role
-- Avoids RLS recursion (profiles querying profiles)
-- Fixed search_path prevents search_path injection attacks
-- DEFINED HERE (after profiles table exists) because it references profiles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Grant execute to authenticated users (policies run as authenticated)
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_location() TO authenticated;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Own profile full access
CREATE POLICY "Own profile full access" ON profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Admin full access via SECURITY DEFINER function (no recursion)
CREATE POLICY "Admin full access profiles" ON profiles
  FOR ALL USING (is_admin());

-- Public profile view for safe public data exposure
-- This view ONLY exposes intentionally public fields, never email/phone/location/prefs/timezone/onboarding
CREATE VIEW public_profiles AS
SELECT
  id,
  display_name,
  avatar_url,
  trust_level,
  role,
  created_at
FROM profiles
WHERE trust_level != 'basic';

-- Grant SELECT on public view to authenticated and anon roles
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Verified helpers public for explore (uses view implicitly via trust_level filter in view)
CREATE POLICY "Verified helpers public" ON profiles
  FOR SELECT USING (role = 'helper' AND trust_level IN ('silver', 'gold'));