-- Admins can inspect booking requests in the web dashboard, so allow the
-- embedded pet relation for pets referenced by bookings visible to admins.
DROP POLICY IF EXISTS "Helpers view pets of booking requests" ON public.pets;
CREATE POLICY "Helpers view pets of booking requests" ON public.pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.pet_id = pets.id
        AND (
          public.is_admin()
          OR b.seeker_id = auth.uid()
          OR b.helper_id = auth.uid()
          OR (
            b.status = 'requested'
            AND b.helper_id IS NULL
            AND b.end_at > NOW()
            AND public.is_verified_helper()
          )
        )
        AND b.status IN ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')
    )
  );
