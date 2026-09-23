-- Owners need to read their own private pet photos to display them in the app.
CREATE POLICY "Pet photo read by owner" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-photos' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );
