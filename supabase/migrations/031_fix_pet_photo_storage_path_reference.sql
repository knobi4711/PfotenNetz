-- Qualify storage.objects.name explicitly. Without qualification PostgreSQL
-- resolves `name` inside the pets subquery to pets.name.
DROP POLICY IF EXISTS "Pet photo read by owner" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo upload by owner" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo update by owner" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo delete by owner" ON storage.objects;

CREATE POLICY "Pet photo read by owner" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM public.pets AS p
      WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Pet photo upload by owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM public.pets AS p
      WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Pet photo update by owner" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM public.pets AS p
      WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
        AND p.owner_id = auth.uid()
    )
  ) WITH CHECK (bucket_id = 'pet-photos');

CREATE POLICY "Pet photo delete by owner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM public.pets AS p
      WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
        AND p.owner_id = auth.uid()
    )
  );
