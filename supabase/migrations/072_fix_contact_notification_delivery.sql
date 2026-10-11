-- Keep contact notifications useful across web and mobile clients.

CREATE OR REPLACE FUNCTION public.notify_contact_request_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.helper_id,
      'contact_request',
      'Neue Kennenlernanfrage',
      'Jemand möchte dich unverbindlich kennenlernen.',
      jsonb_build_object(
        'contact_request_id', NEW.id,
        'url', '/profile',
        'web_url', '/'
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.requester_id,
      'contact_response',
      'Antwort auf Kennenlernanfrage',
      CASE
        WHEN NEW.status = 'accepted' THEN 'Die Anfrage wurde angenommen.'
        ELSE 'Die Anfrage wurde abgelehnt.'
      END,
      jsonb_build_object(
        'contact_request_id', NEW.id,
        'url', '/profile',
        'web_url', '/'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.notifications
SET data = (data - 'url') || jsonb_build_object('url', '/profile', 'web_url', '/'),
  updated_at = NOW()
WHERE type IN ('contact_request', 'contact_response')
  AND data ? 'contact_request_id';
