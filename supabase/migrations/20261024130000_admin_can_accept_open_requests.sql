-- PfotenNetz Migration 083: admins may also accept open booking requests
--
-- Admins already read every booking through the "Admin full access" policy.
-- They should additionally be able to take on care work like a helper, while
-- keeping their admin role and duties. Claiming still moves the request to
-- `awaiting_seeker`, so the seeker keeps the final confirmation.
--
-- Regular helpers keep the regional match (same postal code or within the
-- seeker's radius). Admins are exempt because their read access is not
-- region-scoped in the first place.

CREATE OR REPLACE FUNCTION public.helper_matches_open_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking public.bookings;
  v_helper public.profiles;
  v_seeker public.profiles;
  v_request_location GEOGRAPHY(POINT, 4326);
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_booking.status <> 'requested' OR v_booking.end_at <= NOW() THEN
    RETURN FALSE;
  END IF;
  IF v_booking.helper_id = auth.uid() THEN RETURN TRUE; END IF;
  IF v_booking.helper_id IS NOT NULL THEN RETURN FALSE; END IF;

  -- Admins moderate every request and may claim one without a local match.
  IF public.is_admin() THEN RETURN TRUE; END IF;

  IF NOT public.is_verified_helper() THEN RETURN FALSE; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.private_profile_addresses WHERE profile_id = auth.uid()
  ) THEN RETURN FALSE; END IF;

  SELECT * INTO v_helper FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO v_seeker FROM public.profiles WHERE id = v_booking.seeker_id;
  SELECT exact_location INTO v_request_location
  FROM public.booking_private_locations WHERE booking_id = p_booking_id;

  RETURN (
    v_helper.postal_code IS NOT NULL
    AND v_seeker.postal_code IS NOT NULL
    AND v_helper.postal_code = v_seeker.postal_code
  ) OR (
    v_helper.location IS NOT NULL
    AND v_request_location IS NOT NULL
    AND ST_DWithin(v_helper.location, v_request_location, v_seeker.kiez_radius_km * 1000)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
