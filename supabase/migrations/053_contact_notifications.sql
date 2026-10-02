-- Contact requests become visible to the recipient and support controlled responses.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'contact_request';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'contact_response';

DROP POLICY IF EXISTS "Contact participants can update requests" ON public.contact_requests;

CREATE OR REPLACE FUNCTION public.respond_contact_request(
  p_request_id UUID,
  p_status TEXT
) RETURNS public.contact_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_request public.contact_requests;
BEGIN
  IF p_status NOT IN ('accepted', 'declined') THEN RAISE EXCEPTION 'Invalid contact response'; END IF;
  SELECT * INTO v_request FROM public.contact_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.helper_id <> auth.uid() THEN RAISE EXCEPTION 'Contact request not found'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Contact request is no longer pending'; END IF;
  UPDATE public.contact_requests SET status = p_status, updated_at = NOW() WHERE id = p_request_id RETURNING * INTO v_request;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_contact_request(p_request_id UUID)
RETURNS public.contact_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_request public.contact_requests;
BEGIN
  SELECT * INTO v_request FROM public.contact_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.requester_id <> auth.uid() THEN RAISE EXCEPTION 'Contact request not found'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Contact request is no longer pending'; END IF;
  UPDATE public.contact_requests SET status = 'cancelled', updated_at = NOW() WHERE id = p_request_id RETURNING * INTO v_request;
  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_contact_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_contact_request(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_contact_request_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.helper_id, 'contact_request', 'Neue Kennenlernanfrage', 'Jemand möchte dich unverbindlich kennenlernen.', jsonb_build_object('contact_request_id', NEW.id, 'url', '/(tabs)/profile'));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (NEW.requester_id, 'contact_response', 'Antwort auf Kennenlernanfrage', CASE WHEN NEW.status = 'accepted' THEN 'Die Anfrage wurde angenommen.' ELSE 'Die Anfrage wurde abgelehnt.' END, jsonb_build_object('contact_request_id', NEW.id, 'url', '/(tabs)/profile'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_contact_request_after_write ON public.contact_requests;
CREATE TRIGGER notify_contact_request_after_write
  AFTER INSERT OR UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_contact_request_event();
