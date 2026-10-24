-- PfotenNetz Migration: widen the safety-zone options
--
-- The first release offered 250 m / 500 m / 1 km / 2 km with a 500 m default.
-- In practice those radii were too tight for longer walks and produced
-- "Sicherheitszone verlassen" alerts while the helper was still on the agreed
-- route. The presets are now 1 km / 2 km / 4 km with a free input between
-- 100 m and 10 km, and new bookings default to 1 km.
--
-- Existing rows below 1 km were created with the old default or the removed
-- 250/500 m presets, so they are raised to the new default.

ALTER TABLE public.bookings
  ALTER COLUMN tracking_radius_m SET DEFAULT 1000;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_tracking_radius_m_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_tracking_radius_m_check
  CHECK (tracking_radius_m BETWEEN 100 AND 10000);

UPDATE public.bookings
SET tracking_radius_m = 1000
WHERE tracking_radius_m < 1000;

COMMENT ON COLUMN public.bookings.tracking_radius_m IS
  'Radius of the local safety geofence in meters, configured per booking (100 m - 10 km).';
