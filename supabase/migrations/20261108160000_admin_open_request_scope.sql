-- Admins sehen alle offenen Anfragen, können aber nur lokale annehmen.
--
-- Die Sichtbarkeit bleibt unverändert: helper_matches_open_booking gibt für
-- Admins weiterhin TRUE zurück, damit sie im Rahmen der Moderation alles sehen.
-- Für das Annehmen gilt dagegen dieselbe Ortsprüfung wie für Helfer:
-- gleiche PLZ oder innerhalb des Nachbarschafts-Radius der anfragenden Person.
-- Bei Helfern kommt zusätzlich die eigene Reisebereitschaft hinzu.
--
-- Direkt zugewiesene Anfragen (helper_id gesetzt) bleiben unberührt; dort hat
-- bereits die Erstellungsprüfung den Radius durchgesetzt.

CREATE OR REPLACE FUNCTION public.helper_can_accept_open_booking(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_helper public.profiles;
  v_seeker public.profiles;
  v_request_location GEOGRAPHY(POINT, 4326);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_booking.status <> 'requested' OR v_booking.end_at <= NOW() THEN
    RETURN FALSE;
  END IF;
  IF v_booking.seeker_id = auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Direkt zugewiesene Anfrage: Der zugewiesene Helfer darf annehmen.
  IF v_booking.helper_id = auth.uid() THEN
    RETURN TRUE;
  END IF;
  IF v_booking.helper_id IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_helper FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO v_seeker FROM public.profiles WHERE id = v_booking.seeker_id;
  SELECT exact_location INTO v_request_location
  FROM public.booking_private_locations WHERE booking_id = p_booking_id;

  IF NOT (
    (
      v_helper.postal_code IS NOT NULL
      AND v_seeker.postal_code IS NOT NULL
      AND v_helper.postal_code = v_seeker.postal_code
    ) OR (
      v_helper.location IS NOT NULL
      AND v_request_location IS NOT NULL
      AND ST_DWithin(
        v_helper.location,
        v_request_location,
        v_seeker.kiez_radius_km * 1000
      )
    )
  ) THEN
    RETURN FALSE;
  END IF;

  -- Admins dürfen lokal annehmen, ohne Helper-Verifikation.
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  IF NOT public.is_verified_helper() THEN
    RETURN FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.private_profile_addresses WHERE profile_id = auth.uid()
  ) THEN
    RETURN FALSE;
  END IF;

  -- Ohne beide Standorte lässt sich die Reisebereitschaft nicht prüfen;
  -- dann trägt die PLZ (wie bei der Sichtbarkeit).
  IF v_helper.location IS NULL OR v_request_location IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.helper_availabilities AS availability
    WHERE availability.helper_id = v_helper.id
      AND availability.is_active
      AND v_booking.type::TEXT = ANY(availability.booking_types)
      AND ST_DWithin(
        v_helper.location,
        v_request_location,
        availability.max_distance_km * 1000
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.helper_can_accept_open_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.helper_can_accept_open_booking(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.helper_accept_booking(p_booking_id UUID)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_group_id UUID;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'Booking must be in requested status to accept';
  END IF;
  IF v_booking.end_at <= NOW() THEN RAISE EXCEPTION 'Booking has expired'; END IF;
  IF v_booking.seeker_id = auth.uid() THEN
    RAISE EXCEPTION 'The seeker cannot accept their own booking';
  END IF;
  IF NOT public.helper_can_accept_open_booking(p_booking_id) THEN
    RAISE EXCEPTION 'Diese Anfrage liegt außerhalb deines Nachbarschafts-Radius.';
  END IF;
  IF v_booking.helper_id IS NOT NULL AND v_booking.helper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This booking has already been taken';
  END IF;

  v_group_id := v_booking.booking_group_id;
  IF v_group_id IS NOT NULL THEN
    PERFORM 1 FROM public.bookings b
    WHERE b.booking_group_id = v_group_id FOR UPDATE;
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.booking_group_id = v_group_id
        AND (
          b.status <> 'requested'
          OR b.end_at <= NOW()
          OR (b.helper_id IS NOT NULL AND b.helper_id IS DISTINCT FROM auth.uid())
        )
    ) THEN
      RAISE EXCEPTION 'All pets in the request must still be available';
    END IF;
  END IF;

  UPDATE public.bookings
  SET helper_id = auth.uid(), status = 'awaiting_seeker', updated_at = NOW()
  WHERE id = p_booking_id OR (v_group_id IS NOT NULL AND booking_group_id = v_group_id);
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
