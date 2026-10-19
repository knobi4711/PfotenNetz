-- PfotenNetz Migration 076: Keep pet names visible on open booking requests
--
-- Migration 075 restored archived pet visibility but accidentally removed the
-- visibility rule for unassigned open requests. This made the booking row
-- visible to verified helpers while the embedded pet row was filtered out by
-- RLS, causing the UI to display the generic fallback "Tier".

DROP POLICY IF EXISTS "Helpers view pets of active bookings" ON public.pets;

CREATE POLICY "Helpers view pets of booking requests" ON public.pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.pet_id = pets.id
        AND (
          b.seeker_id = auth.uid()
          OR b.helper_id = auth.uid()
          OR (
            b.status = 'requested'
            AND b.helper_id IS NULL
            AND public.is_verified_helper()
          )
        )
        AND b.status IN ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')
    )
  );
