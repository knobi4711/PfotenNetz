-- PfotenNetz Migration 026: Booking + verification notification fan-out
--
-- Server-side fan-out so seeker/helper get a notifications row on every
-- booking state change, without any client needing elevated privileges.
-- The trigger never raises for business cases: when no recipient applies,
-- it simply inserts nothing. Actual push delivery (Expo/FCM/APNs) stays
-- outside the DB; devices.push_token is filled by the app, a push worker
-- can consume rows with push_sent = false.
--
-- Apply via Supabase Dashboard SQL editor (no CLI linked in this repo).

-- ---------------------------------------------------------------------------
-- Booking events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_booking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recipient UUID;
  v_second_recipient UUID := NULL;
  v_type TEXT;
  v_title TEXT;
  v_body TEXT;
  v_data JSONB;
BEGIN
  v_data := jsonb_build_object(
    'booking_id', NEW.id,
    'url', '/booking/' || NEW.id::text
  );

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'requested' OR NEW.helper_id IS NULL THEN
      RETURN NEW;
    END IF;
    v_recipient := NEW.helper_id;
    v_type := 'booking_request';
    v_title := 'Neue Betreuungsanfrage';
    v_body := 'Anfrage ' || NEW.booking_number || ' wartet auf deine Antwort.';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    IF OLD.status = 'requested' AND NEW.status = 'confirmed' THEN
      v_recipient := NEW.seeker_id;
      v_type := 'booking_confirmed';
      v_title := 'Anfrage bestätigt';
      v_body := 'Anfrage ' || NEW.booking_number || ' wurde bestätigt.';
    ELSIF NEW.status = 'cancelled' AND OLD.status IN ('requested', 'confirmed') THEN
      v_type := 'booking_cancelled';
      v_title := 'Buchung storniert';
      v_body := 'Buchung ' || NEW.booking_number || ' wurde storniert.';
      IF NEW.cancelled_by IS NOT DISTINCT FROM NEW.helper_id THEN
        v_recipient := NEW.seeker_id;
      ELSIF NEW.cancelled_by IS NOT DISTINCT FROM NEW.seeker_id AND NEW.helper_id IS NOT NULL THEN
        v_recipient := NEW.helper_id;
      ELSE
        RETURN NEW;
      END IF;
    ELSIF OLD.status = 'confirmed' AND NEW.status = 'in_progress' THEN
      v_recipient := NEW.seeker_id;
      v_type := 'tracking_started';
      v_title := 'Betreuung läuft';
      v_body := 'Buchung ' || NEW.booking_number || ' hat begonnen.';
    ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
      v_type := 'timebank_update';
      v_title := 'Betreuung abgeschlossen';
      v_body := 'Buchung ' || NEW.booking_number || ' ist abgeschlossen.';
      v_recipient := NEW.seeker_id;
      v_second_recipient := NEW.helper_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (v_recipient, v_type::public.notification_type, v_title, v_body, v_data);

  IF v_second_recipient IS NOT NULL AND v_second_recipient IS DISTINCT FROM v_recipient THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_second_recipient, v_type::public.notification_type, v_title, v_body, v_data);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_booking_event_after_write ON public.bookings;
CREATE TRIGGER notify_booking_event_after_write
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_event();

REVOKE ALL ON FUNCTION public.notify_booking_event() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Verification decisions (admin approval / rejection)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_verification_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'pending' OR NEW.status IS NOT DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'verification_update',
      'Verifizierung bestätigt',
      'Dein Nachweis wurde bestätigt.',
      jsonb_build_object('url', '/(tabs)/profile')
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'verification_update',
      'Verifizierung abgelehnt',
      COALESCE('Dein Nachweis wurde abgelehnt: ' || NEW.rejection_reason, 'Dein Nachweis wurde abgelehnt.'),
      jsonb_build_object('url', '/(tabs)/profile')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_verification_event_after_update ON public.verifications;
CREATE TRIGGER notify_verification_event_after_update
  AFTER UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_verification_event();

REVOKE ALL ON FUNCTION public.notify_verification_event() FROM PUBLIC;
