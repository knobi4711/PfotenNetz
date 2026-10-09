-- PfotenNetz Database Migration 068: Optionaler temporärer Einzug beim Tier

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_care_location_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_care_location_check
  CHECK (care_location IN ('at_owner_home', 'at_owner_home_live_in', 'at_helper_home'));
