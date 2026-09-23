-- PfotenNetz Database Migration 016: Database Functions & RPCs

-- Haversine distance function
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371000; -- Earth radius in meters
  φ1 DOUBLE PRECISION := radians(lat1);
  φ2 DOUBLE PRECISION := radians(lat2);
  Δφ DOUBLE PRECISION := radians(lat2 - lat1);
  Δλ DOUBLE PRECISION := radians(lon2 - lon1);
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  a := sin(Δφ/2)^2 + cos(φ1) * cos(φ2) * sin(Δλ/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find nearby helpers for booking
CREATE OR REPLACE FUNCTION find_nearby_helpers(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km NUMERIC DEFAULT 2.0,
  p_limit INT DEFAULT 20
) RETURNS TABLE (
  helper_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  trust_level TEXT,
  distance_km NUMERIC,
  rating NUMERIC,
  total_walks INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS helper_id,
    p.display_name,
    p.avatar_url,
    p.trust_level,
    round(haversine_distance(p_latitude, p_longitude, 
      ST_Y(p.location::geometry), ST_X(p.location::geometry)) / 1000, 2) AS distance_km,
    COALESCE(AVG(b.rating_helper), 0) AS rating,
    COUNT(b.id) FILTER (WHERE b.status = 'completed') AS total_walks
  FROM profiles p
  LEFT JOIN bookings b ON b.helper_id = p.id
  WHERE p.role = 'helper'
    AND p.trust_level IN ('silver', 'gold')
    AND p.location IS NOT NULL
    AND haversine_distance(p_latitude, p_longitude,
      ST_Y(p.location::geometry), ST_X(p.location::geometry)) <= p_radius_km * 1000
  GROUP BY p.id
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Find active hazards in radius
CREATE OR REPLACE FUNCTION get_active_hazards_in_radius(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km NUMERIC DEFAULT 5.0
) RETURNS TABLE (
  id UUID,
  hazard_number TEXT,
  type TEXT,
  severity TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_km NUMERIC,
  description TEXT,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.hazard_number,
    h.type,
    h.severity,
    ST_Y(h.location::geometry) AS latitude,
    ST_X(h.location::geometry) AS longitude,
    h.radius_km,
    h.description,
    round(haversine_distance(p_latitude, p_longitude,
      ST_Y(h.location::geometry), ST_X(h.location::geometry)) / 1000, 2) AS distance_km
  FROM hazards h
  WHERE h.status = 'active'
    AND h.expires_at > NOW()
    AND haversine_distance(p_latitude, p_longitude,
      ST_Y(h.location::geometry), ST_X(h.location::geometry)) <= p_radius_km * 1000
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- User stats for profile
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_bookings INT,
  completed_bookings INT,
  timebank_balance NUMERIC,
  trust_level TEXT,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(b.id) AS total_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'completed') AS completed_bookings,
    COALESCE(tba.balance_hours, 0) AS timebank_balance,
    p.trust_level,
    COALESCE(
      (AVG(b.rating_helper) + AVG(b.rating_seeker)) / 2,
      0
    ) AS avg_rating
  FROM profiles p
  LEFT JOIN bookings b ON b.seeker_id = p.id OR b.helper_id = p.id
  LEFT JOIN timebank_accounts tba ON tba.user_id = p.id
  WHERE p.id = p_user_id
  GROUP BY p.id, tba.balance_hours, p.trust_level;
END;
$$ LANGUAGE plpgsql STABLE;