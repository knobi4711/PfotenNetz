-- Exact addresses and coordinates must not be returned by the general booking
-- query, which is also used to show local open requests to potential helpers.
CREATE TABLE public.booking_private_locations (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  exact_address TEXT,
  exact_location GEOGRAPHY(POINT, 4326),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_private_locations_address_length
    CHECK (exact_address IS NULL OR char_length(exact_address) <= 300)
);

CREATE INDEX booking_private_locations_geo_idx
  ON public.booking_private_locations USING GIST (exact_location);

CREATE TABLE public.private_profile_addresses (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  exact_address TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT private_profile_address_length CHECK (char_length(exact_address) BETWEEN 5 AND 300)
);

ALTER TABLE public.private_profile_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.private_profile_addresses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.private_profile_addresses TO authenticated;
CREATE POLICY "Own address and confirmed care partner address"
  ON public.private_profile_addresses FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE ((
          b.seeker_id = private_profile_addresses.profile_id
          AND b.helper_id = auth.uid()
          AND b.care_location IN ('at_owner_home', 'at_owner_home_live_in')
        ) OR (
          b.helper_id = private_profile_addresses.profile_id
          AND b.seeker_id = auth.uid()
          AND b.care_location = 'at_helper_home'
        ))
        AND b.status IN ('confirmed', 'in_progress', 'completed')
    )
  );

CREATE OR REPLACE FUNCTION public.save_own_private_address(p_address TEXT, p_postal_code TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_address IS NULL OR char_length(BTRIM(p_address)) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'Address must contain between 5 and 300 characters';
  END IF;
  IF p_postal_code IS NULL OR p_postal_code !~ '^[0-9]{5}$' THEN
    RAISE EXCEPTION 'A valid five-digit postal code is required';
  END IF;

  UPDATE public.profiles SET postal_code = p_postal_code WHERE id = auth.uid();
  INSERT INTO public.private_profile_addresses (profile_id, exact_address)
  VALUES (auth.uid(), BTRIM(p_address))
  ON CONFLICT (profile_id) DO UPDATE
    SET exact_address = EXCLUDED.exact_address, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.save_own_private_address(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_own_private_address(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.require_address_for_helper_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'helper' AND OLD.role IS DISTINCT FROM 'helper'
     AND NOT EXISTS (
       SELECT 1 FROM public.private_profile_addresses WHERE profile_id = NEW.id
     ) THEN
    RAISE EXCEPTION 'A private home address is required before helper approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.require_address_for_helper_role() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER require_private_address_for_helper_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.require_address_for_helper_role();

CREATE OR REPLACE FUNCTION public.require_address_for_helper_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IN ('id_document', 'liability_insurance') AND NOT EXISTS (
    SELECT 1 FROM public.private_profile_addresses WHERE profile_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'A private home address is required before requesting helper verification';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.require_address_for_helper_verification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER require_private_address_for_helper_verification
  BEFORE INSERT ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.require_address_for_helper_verification();

-- Require address capture before a user can publish a care request.
CREATE OR REPLACE FUNCTION public.validate_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner_id UUID;
BEGIN
  IF NEW.seeker_id IS NULL THEN RAISE EXCEPTION 'Booking seeker is required'; END IF;
  SELECT owner_id INTO v_owner_id FROM public.pets WHERE id = NEW.pet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pet not found'; END IF;
  IF v_owner_id IS DISTINCT FROM NEW.seeker_id THEN RAISE EXCEPTION 'Pet does not belong to the seeker'; END IF;
  IF NEW.end_at IS NULL OR NEW.start_at IS NULL OR NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'Booking end must be after start';
  END IF;
  IF NEW.status IS DISTINCT FROM 'requested' THEN RAISE EXCEPTION 'New bookings must start as requested'; END IF;
  IF NEW.helper_id IS NOT DISTINCT FROM NEW.seeker_id THEN
    RAISE EXCEPTION 'Seeker and helper must be different users';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.private_profile_addresses WHERE profile_id = NEW.seeker_id
  ) THEN
    RAISE EXCEPTION 'Add a private home address to your profile before creating a request';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.booking_private_locations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_private_locations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.booking_private_locations TO authenticated;

CREATE POLICY "Booking location visible to owner or confirmed helper"
  ON public.booking_private_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_private_locations.booking_id
        AND (
          b.seeker_id = auth.uid()
          OR (
            b.helper_id = auth.uid()
            AND b.status IN ('confirmed', 'in_progress', 'completed')
          )
        )
    )
  );

-- Move legacy and new direct booking writes out of the broadly-readable row.
CREATE OR REPLACE FUNCTION public.protect_booking_location()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.booking_private_locations (booking_id, exact_address, exact_location)
  VALUES (
    NEW.id,
    NULLIF(BTRIM(NEW.meeting_address), ''),
    COALESCE(NEW.meeting_location, (SELECT p.location FROM public.profiles p WHERE p.id = NEW.seeker_id))
  )
  ON CONFLICT (booking_id) DO UPDATE
    SET exact_address = COALESCE(EXCLUDED.exact_address, booking_private_locations.exact_address),
        exact_location = COALESCE(EXCLUDED.exact_location, booking_private_locations.exact_location),
        updated_at = NOW();
  NEW.meeting_address := NULL;
  NEW.meeting_location := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.protect_booking_location() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER protect_booking_location_before_write
  BEFORE INSERT OR UPDATE OF meeting_address, meeting_location ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_location();

-- Move existing clear-text addresses and coordinates into the private table.
INSERT INTO public.booking_private_locations (booking_id, exact_address, exact_location)
SELECT id, NULLIF(BTRIM(meeting_address), ''), meeting_location
FROM public.bookings
WHERE meeting_address IS NOT NULL OR meeting_location IS NOT NULL
ON CONFLICT (booking_id) DO UPDATE
  SET exact_address = EXCLUDED.exact_address,
      exact_location = EXCLUDED.exact_location,
      updated_at = NOW();

UPDATE public.bookings
SET meeting_address = NULL, meeting_location = NULL
WHERE meeting_address IS NOT NULL OR meeting_location IS NOT NULL;

INSERT INTO public.booking_private_locations (booking_id, exact_location)
SELECT b.id, p.location
FROM public.bookings b
JOIN public.profiles p ON p.id = b.seeker_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_private_locations l
  WHERE l.booking_id = b.id AND l.exact_location IS NOT NULL
)
ON CONFLICT (booking_id) DO UPDATE
  SET exact_location = EXCLUDED.exact_location;

-- Keep profile home coordinates private; public helper cards use the dedicated
-- public_profiles view and helper-search RPCs, which return rounded positions.
DROP POLICY IF EXISTS "Verified helpers public" ON public.profiles;

-- Matching uses exact stored request coordinates internally; they remain
-- inaccessible through booking rows and this security-definer predicate.
CREATE OR REPLACE FUNCTION public.helper_matches_open_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking public.bookings;
  v_helper public.profiles;
  v_seeker public.profiles;
  v_request_location GEOGRAPHY(POINT, 4326);
BEGIN
  IF NOT public.is_verified_helper() THEN RETURN FALSE; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_booking.status <> 'requested' OR v_booking.end_at <= NOW() THEN
    RETURN FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.private_profile_addresses WHERE profile_id = auth.uid()
  ) THEN RETURN FALSE; END IF;
  IF v_booking.helper_id = auth.uid() THEN RETURN TRUE; END IF;
  IF v_booking.helper_id IS NOT NULL THEN RETURN FALSE; END IF;
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

-- Newly created tables require explicit Data API grants, even though RLS limits
-- reads to the request owner and the confirmed helper.
