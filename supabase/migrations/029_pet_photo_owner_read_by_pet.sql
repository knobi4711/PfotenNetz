-- Also authorize owners through the pet relation. This remains valid if the
-- storage object's owner metadata is not populated by an Android upload.
DROP POLICY IF EXISTS "Pet photo read by owner" ON storage.objects;

CREATE POLICY "Pet photo read by owner" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1
      FROM public.pets
      WHERE pets.owner_id = auth.uid()
        AND pets.id = (storage.foldername(name))[2]::uuid
    )
  );
