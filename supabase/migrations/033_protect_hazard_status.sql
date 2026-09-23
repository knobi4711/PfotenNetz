-- Hazard status is controlled by moderation, not by the reporting user.
CREATE OR REPLACE FUNCTION prevent_unauthorized_hazard_status_change()
RETURNS trigger AS $$
BEGIN
  IF NOT is_admin() AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only moderators can change a hazard status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_hazard_status ON public.hazards;
CREATE TRIGGER protect_hazard_status
  BEFORE UPDATE ON public.hazards
  FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_hazard_status_change();
