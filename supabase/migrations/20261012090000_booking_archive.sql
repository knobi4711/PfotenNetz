-- PfotenNetz Migration 075: archive terminal bookings after three days
--
-- Bookings are retained for the participants. The immutable closed_at value
-- separates the active view from the archive without moving or deleting data.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Preserve the best available lifecycle timestamp for rows that already exist.
UPDATE public.bookings
SET closed_at = CASE
  WHEN status = 'cancelled' THEN COALESCE(cancelled_at, updated_at)
  WHEN status = 'completed' THEN updated_at
  ELSE NULL
END
WHERE status IN ('cancelled', 'completed')
  AND closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_closed_at
  ON public.bookings(closed_at)
  WHERE closed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_booking_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.closed_at IS NOT NULL THEN
    NEW.closed_at := OLD.closed_at;
  ELSIF NEW.status IN ('completed', 'cancelled') AND NEW.closed_at IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.closed_at := NOW();
    ELSIF OLD.status NOT IN ('completed', 'cancelled') THEN
      NEW.closed_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_booking_closed_at_before_write ON public.bookings;
CREATE TRIGGER set_booking_closed_at_before_write
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_closed_at();

-- Archived participants must retain enough related data to understand the
-- completed or cancelled booking, including the other participant and pet.
DROP POLICY IF EXISTS "Booking participant profile details" ON public.profiles;
CREATE POLICY "Booking participant profile details" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
        AND (b.seeker_id = profiles.id OR b.helper_id = profiles.id)
        AND b.status IN ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')
    )
  );

DROP POLICY IF EXISTS "Helpers view pets of active bookings" ON public.pets;
CREATE POLICY "Helpers view pets of active bookings" ON public.pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.pet_id = pets.id
        AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
        AND b.status IN ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')
    )
  );
