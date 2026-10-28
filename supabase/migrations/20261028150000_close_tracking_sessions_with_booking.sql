-- PfotenNetz: close tracking sessions when their booking reaches a terminal state
--
-- `tracking_sessions.ended_at` was only ever set by the client ("Tracking
-- beenden"). If the helper completed or cancelled the booking while tracking
-- was running, `TrackingRecorder` unmounted before it could call
-- `finishTrackingSession`, so the session stayed open forever. Because
-- `fetchActiveTrackingSessions` only filters on `ended_at IS NULL`, both
-- participants kept seeing a permanent "Live-Betreuung" entry for a booking
-- that was already archived.
--
-- The booking is the source of truth for the lifecycle, so close its open
-- sessions server-side instead of relying on the client.

-- 1. Repair sessions that were already orphaned by this gap.
UPDATE public.tracking_sessions AS ts
SET
  ended_at = COALESCE(b.closed_at, b.updated_at, NOW()),
  total_duration_seconds = GREATEST(
    ts.total_duration_seconds,
    GREATEST(
      0,
      EXTRACT(EPOCH FROM (COALESCE(b.closed_at, b.updated_at, NOW()) - ts.started_at))::INTEGER
    )
  )
FROM public.bookings AS b
WHERE b.id = ts.booking_id
  AND ts.ended_at IS NULL
  AND b.status NOT IN ('confirmed', 'in_progress');

-- 2. Keep sessions closed from now on.
CREATE OR REPLACE FUNCTION public.close_tracking_sessions_for_terminal_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.tracking_sessions
  SET
    ended_at = COALESCE(NEW.closed_at, NOW()),
    total_duration_seconds = GREATEST(
      total_duration_seconds,
      GREATEST(
        0,
        EXTRACT(EPOCH FROM (COALESCE(NEW.closed_at, NOW()) - started_at))::INTEGER
      )
    )
  WHERE booking_id = NEW.id
    AND ended_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS close_tracking_sessions_for_terminal_booking ON public.bookings;
CREATE TRIGGER close_tracking_sessions_for_terminal_booking
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (
    NEW.status IN ('completed', 'cancelled', 'disputed')
    AND NEW.status IS DISTINCT FROM OLD.status
  )
  EXECUTE FUNCTION public.close_tracking_sessions_for_terminal_booking();

REVOKE ALL ON FUNCTION public.close_tracking_sessions_for_terminal_booking() FROM PUBLIC;
