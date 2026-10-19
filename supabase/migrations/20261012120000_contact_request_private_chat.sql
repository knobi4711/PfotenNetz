-- PfotenNetz Migration 077: Private chat for getting to know each other
--
-- The introductory contact request is intentionally separate from a booking.
-- Both participants may exchange messages while the request is pending or
-- accepted, before a booking is created or confirmed.

CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_request_id UUID NOT NULL REFERENCES public.contact_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (char_length(BTRIM(content)) BETWEEN 1 AND 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contact_messages_request_idx
  ON public.contact_messages(contact_request_id, created_at);

CREATE INDEX contact_messages_sender_idx
  ON public.contact_messages(sender_id, created_at DESC);

CREATE TRIGGER update_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contact participants read private messages" ON public.contact_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.contact_requests r
      WHERE r.id = contact_messages.contact_request_id
        AND (r.requester_id = auth.uid() OR r.helper_id = auth.uid())
  )
);

CREATE POLICY "Contact participants send private messages" ON public.contact_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.contact_requests r
      WHERE r.id = contact_messages.contact_request_id
        AND (r.requester_id = auth.uid() OR r.helper_id = auth.uid())
        AND r.status IN ('pending', 'accepted')
    )
  );

GRANT SELECT, INSERT ON public.contact_messages TO authenticated;
