-- Fix participant reads to use the storage object's path, not pets.name.
DROP POLICY IF EXISTS "Pet photo read by participants" ON storage.objects;

CREATE POLICY "Pet photo read by participants" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1
      FROM public.bookings AS b
      JOIN public.pets AS p ON p.id = b.pet_id
      WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
        AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
        AND b.status IN ('confirmed', 'in_progress', 'completed')
    )
  );
