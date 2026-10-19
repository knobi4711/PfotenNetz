-- PfotenNetz Migration 078: Start the private chat with the request message

CREATE OR REPLACE FUNCTION public.seed_contact_request_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.contact_messages (contact_request_id, sender_id, content)
  VALUES (NEW.id, NEW.requester_id, NEW.message);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_contact_request_message_after_insert ON public.contact_requests;
CREATE TRIGGER seed_contact_request_message_after_insert
  AFTER INSERT ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.seed_contact_request_message();
