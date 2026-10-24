-- PfotenNetz Migration: configurable safety zone per booking
--
-- The mobile app defined the safety zone around the tracking start point with a
-- hard-coded 500 m radius (apps/mobile/lib/geofence.native.ts). Long walks left
-- the zone regularly and produced false "Sicherheitszone verlassen" alerts.
--
-- The radius is now a booking attribute chosen by the seeker when creating the
-- request (default 500 m, allowed range 100 m – 5 km). The helper's device uses
-- it when starting the geofence.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tracking_radius_m INTEGER NOT NULL DEFAULT 500;

COMMENT ON COLUMN public.bookings.tracking_radius_m IS
  'Radius of the local safety geofence in meters, configured per booking.';

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_tracking_radius_m_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_tracking_radius_m_check
  CHECK (tracking_radius_m BETWEEN 100 AND 5000);
