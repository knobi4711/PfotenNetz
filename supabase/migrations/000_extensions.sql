-- PfotenNetz Database Migration 000: Extensions & Helpers
-- Run: supabase db reset (local) or supabase migration up

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Updated_at trigger function (no table dependencies)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: current_user_location() and is_admin() are defined in 001_profiles.sql
-- after the profiles table exists, since they reference the profiles table.