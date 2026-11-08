-- Offene Anfragen und Direktanfragen beachten die Reisebereitschaft des Helfers.
--
-- Sichtbarkeit offener Anfragen (bisher): gleiche PLZ ODER innerhalb des
-- Nachbarschafts-Radius der anfragenden Person. Neu kommt die Reisebereitschaft
-- des Helfers hinzu: Es muss ein aktives Verfügbarkeitsfenster geben, das die
-- Betreuungsart anbietet und dessen Maximalradius den Anfrageort abdeckt.
-- Die PLZ bleibt ein gleichwertiger zweiter Weg; die Radiusprüfung greift,
-- sobald beide Standorte bekannt sind.
--
-- Direktanfragen (helper_id gesetzt) werden beim Anlegen serverseitig geprüft,
-- damit ein Detail-Link den Such- und Reiseradius nicht umgehen kann.

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

  -- Admins moderieren jede Anfrage und dürfen sie ohne lokalen Treffer annehmen.
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
    (
      v_helper.postal_code IS NOT NULL
      AND v_seeker.postal_code IS NOT NULL
      AND v_helper.postal_code = v_seeker.postal_code
    ) OR (
      v_helper.location IS NOT NULL
      AND v_request_location IS NOT NULL
      AND ST_DWithin(v_helper.location, v_request_location, v_seeker.kiez_radius_km * 1000)
    )
  ) AND (
    -- Ohne beide Standorte lässt sich kein Radius prüfen; dann trägt die PLZ.
    v_helper.location IS NULL
    OR v_request_location IS NULL
    OR EXISTS (
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
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.helper_matches_open_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.helper_matches_open_booking(UUID) TO authenticated;

-- Direktanfrage: Der gewählte Helfer muss die Betreuungsart in der Entfernung
-- anbieten. Bewusst nur die Betreuungsart, nicht Tag/Uhrzeit (Entscheidung
-- zugunsten der Reichweite).
CREATE OR REPLACE FUNCTION public.validate_booking_helper_radius()
RETURNS TRIGGER AS $$
DECLARE
  v_helper public.profiles;
  v_seeker_location GEOGRAPHY(POINT, 4326);
  v_request_location GEOGRAPHY(POINT, 4326);
BEGIN
  IF NEW.helper_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_helper FROM public.profiles WHERE id = NEW.helper_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Helfer nicht gefunden.';
  END IF;
  IF v_helper.location IS NULL THEN
    RAISE EXCEPTION 'Der Helfer hat noch keinen Standort hinterlegt.';
  END IF;

  SELECT location INTO v_seeker_location
  FROM public.profiles WHERE id = NEW.seeker_id;
  v_request_location := COALESCE(NEW.meeting_location, v_seeker_location);
  IF v_request_location IS NULL THEN
    RAISE EXCEPTION 'Bitte hinterlege zuerst deinen Standort im Profil.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.helper_availabilities AS availability
    WHERE availability.helper_id = NEW.helper_id
      AND availability.is_active
      AND NEW.type::TEXT = ANY(availability.booking_types)
      AND ST_DWithin(v_helper.location, v_request_location, availability.max_distance_km * 1000)
  ) THEN
    RAISE EXCEPTION 'Der Helfer bietet diese Betreuungsart nicht in deiner Entfernung an.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.validate_booking_helper_radius() FROM PUBLIC;

DROP TRIGGER IF EXISTS validate_booking_helper_radius_before_insert ON public.bookings;
CREATE TRIGGER validate_booking_helper_radius_before_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_helper_radius();
