-- PfotenNetz Migration 041: Server-maintained live tracking position
--
-- tracking_points remains the audit trail. The latest point is mirrored onto
-- the session so Realtime consumers can subscribe to tracking_sessions without
-- processing every historical point themselves.

ALTER TABLE public.tracking_sessions
  ADD COLUMN IF NOT EXISTS latest_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS latest_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS latest_accuracy_meters NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS latest_speed_mps NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS latest_heading_degrees SMALLINT,
  ADD COLUMN IF NOT EXISTS latest_recorded_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.sync_tracking_live_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.tracking_sessions
  SET
    latest_latitude = NEW.latitude,
    latest_longitude = NEW.longitude,
    latest_accuracy_meters = NEW.accuracy_meters,
    latest_speed_mps = NEW.speed_mps,
    latest_heading_degrees = NEW.heading_degrees,
    latest_recorded_at = NEW.recorded_at
  WHERE id = NEW.session_id
    AND ended_at IS NULL
    AND (
      latest_recorded_at IS NULL
      OR NEW.recorded_at >= latest_recorded_at
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_tracking_live_position_after_insert ON public.tracking_points;
CREATE TRIGGER sync_tracking_live_position_after_insert
  AFTER INSERT ON public.tracking_points
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tracking_live_position();

REVOKE ALL ON FUNCTION public.sync_tracking_live_position() FROM PUBLIC;
