-- PfotenNetz Migration 042: Server-authoritative live tracking telemetry
--
-- Keep live distance and duration current while points arrive. The client
-- still sends its final totals for compatibility, but active-session views no
-- longer depend on a client-side recalculation.

CREATE OR REPLACE FUNCTION public.update_tracking_telemetry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  previous_latitude DOUBLE PRECISION;
  previous_longitude DOUBLE PRECISION;
  arc DOUBLE PRECISION;
  distance_increment INTEGER := 0;
  duration_value INTEGER := 0;
BEGIN
  SELECT latitude, longitude
  INTO previous_latitude, previous_longitude
  FROM public.tracking_points
  WHERE session_id = NEW.session_id
    AND id <> NEW.id
    AND recorded_at <= NEW.recorded_at
  ORDER BY recorded_at DESC, received_at DESC
  LIMIT 1;

  IF previous_latitude IS NOT NULL AND previous_longitude IS NOT NULL THEN
    arc :=
      sin(radians(NEW.latitude - previous_latitude) / 2) ^ 2
      + cos(radians(previous_latitude))
        * cos(radians(NEW.latitude))
        * sin(radians(NEW.longitude - previous_longitude) / 2) ^ 2;
    distance_increment := round(6371000 * 2 * asin(sqrt(least(1, arc))))::INTEGER;
  END IF;

  SELECT greatest(
    0,
    extract(epoch FROM (NEW.recorded_at - started_at))::INTEGER
  )
  INTO duration_value
  FROM public.tracking_sessions
  WHERE id = NEW.session_id;

  UPDATE public.tracking_sessions
  SET
    total_distance_meters = greatest(0, total_distance_meters + distance_increment),
    total_duration_seconds = greatest(total_duration_seconds, coalesce(duration_value, 0))
  WHERE id = NEW.session_id
    AND ended_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_tracking_telemetry_after_insert ON public.tracking_points;
CREATE TRIGGER update_tracking_telemetry_after_insert
  AFTER INSERT ON public.tracking_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tracking_telemetry();

REVOKE ALL ON FUNCTION public.update_tracking_telemetry() FROM PUBLIC;
