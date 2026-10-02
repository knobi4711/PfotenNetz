-- Allow a sighting reporter to read the sighting they just created.
-- This is required for INSERT ... RETURNING used by the client upload flow.
DROP POLICY IF EXISTS "Sightings are readable for active reports"
  ON public.missing_pet_sightings;

CREATE POLICY "Sightings are readable for active reports"
  ON public.missing_pet_sightings
  FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.missing_pets mp
      WHERE mp.id = missing_pet_id
        AND mp.status = 'active'
    )
  );
