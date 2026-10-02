-- Unverbindlicher Erstkontakt vor einer Betreuung (Original.pdf).
CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_id <> helper_id)
);

CREATE INDEX contact_requests_requester_idx ON public.contact_requests(requester_id, created_at DESC);
CREATE INDEX contact_requests_helper_idx ON public.contact_requests(helper_id, created_at DESC);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contact participants can read requests" ON public.contact_requests
  FOR SELECT USING (requester_id = auth.uid() OR helper_id = auth.uid());

CREATE POLICY "Users can create contact requests" ON public.contact_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = helper_id AND role = 'helper' AND trust_level IN ('silver', 'gold')
    )
  );

CREATE POLICY "Contact participants can update requests" ON public.contact_requests
  FOR UPDATE USING (requester_id = auth.uid() OR helper_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR helper_id = auth.uid());

CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.contact_requests TO authenticated;
