-- Meldungen gegen Nutzer:innen wegen Fake-Profilen, Spam oder anderem Fehlverhalten.
CREATE TABLE public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('fake_profile', 'spam', 'harassment', 'other')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX user_reports_status_created_idx ON public.user_reports(status, created_at DESC);
CREATE INDEX user_reports_reported_user_idx ON public.user_reports(reported_user_id, created_at DESC);
CREATE UNIQUE INDEX user_reports_one_pending_per_pair_idx
  ON public.user_reports(reporter_id, reported_user_id)
  WHERE status = 'pending';

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.user_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid() AND reporter_id <> reported_user_id);

CREATE POLICY "Admins can read reports" ON public.user_reports
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update reports" ON public.user_reports
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

GRANT INSERT ON public.user_reports TO authenticated;
GRANT SELECT, UPDATE ON public.user_reports TO authenticated;
