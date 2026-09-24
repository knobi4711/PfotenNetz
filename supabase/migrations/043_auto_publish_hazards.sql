-- PfotenNetz Migration 043: Publish urgent hazard reports immediately
--
-- Until a later moderation policy is introduced, neighborhood safety reports
-- become active immediately. Admins can still reject or resolve them after
-- publication.

CREATE OR REPLACE FUNCTION public.auto_publish_hazard_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('draft', 'pending_review') THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_publish_hazard_report_before_insert ON public.hazards;
CREATE TRIGGER auto_publish_hazard_report_before_insert
  BEFORE INSERT ON public.hazards
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_publish_hazard_report();

UPDATE public.hazards
SET status = 'active'
WHERE status = 'pending_review'
  AND expires_at > NOW();

REVOKE ALL ON FUNCTION public.auto_publish_hazard_report() FROM PUBLIC;
