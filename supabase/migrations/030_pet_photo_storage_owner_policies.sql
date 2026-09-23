-- Android uploads can omit storage owner metadata. Authorize pet photos by
-- the authenticated owner of the pet encoded in the second path segment.
DROP POLICY IF EXISTS "Pet photo upload by owner" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo update by owner" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo delete by owner" ON storage.objects;

CREATE POLICY "Pet photo upload by owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = (storage.foldername(name))[2]::uuid
        AND pets.owner_id = auth.uid()
    )
  );

CREATE POLICY "Pet photo update by owner" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = (storage.foldername(name))[2]::uuid
        AND pets.owner_id = auth.uid()
    )
  ) WITH CHECK (bucket_id = 'pet-photos');

CREATE POLICY "Pet photo delete by owner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = (storage.foldername(name))[2]::uuid
        AND pets.owner_id = auth.uid()
    )
  );
