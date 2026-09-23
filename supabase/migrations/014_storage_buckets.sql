-- PfotenNetz Database Migration 014: Storage Buckets & Policies

-- Buckets are created via Supabase Dashboard or CLI
-- This migration defines the bucket policies

-- avatars (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar upload by owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() = owner
  );

CREATE POLICY "Avatar read public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatar update by owner" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Avatar delete by owner" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND owner = auth.uid());

-- pet-photos (Private)
-- Path structure: {owner_id}/{pet_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pet-photos', 'pet-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Pet photo upload by owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pet-photos' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

CREATE POLICY "Pet photo read by participants" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-photos' AND
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN pets p ON p.id = b.pet_id
      WHERE p.id = (storage.foldername(name))[2]::uuid
      AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
      AND b.status IN ('confirmed', 'in_progress', 'completed')
    )
  );

CREATE POLICY "Pet photo update by owner" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pet-photos' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

CREATE POLICY "Pet photo delete by owner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pet-photos' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

-- hazard-photos (Private bucket - drafts private, published via Signed URLs)
-- Path structure: {hazard_id}/{filename}
-- Variant B: Single PRIVATE bucket with Signed URLs for public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hazard-photos', 'hazard-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Hazard photo upload by reporter" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hazard-photos' AND
    auth.uid() = (SELECT reporter_id FROM hazards WHERE id = (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Hazard photo read by reporter" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hazard-photos' AND
    auth.uid() = (SELECT reporter_id FROM hazards WHERE id = (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Hazard photo read active by nearby users" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hazard-photos' AND
    EXISTS (
      SELECT 1 FROM hazards h
      WHERE h.id = (storage.foldername(name))[1]::uuid
      AND h.status = 'active'
      AND h.expires_at > NOW()
      AND ST_DWithin(h.location, current_user_location(), h.radius_km * 1000)
    )
  );

CREATE POLICY "Hazard photo update by reporter" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'hazard-photos' AND
    auth.uid() = (SELECT reporter_id FROM hazards WHERE id = (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Hazard photo delete by reporter" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'hazard-photos' AND
    auth.uid() = (SELECT reporter_id FROM hazards WHERE id = (storage.foldername(name))[1]::uuid)
  );

-- verification-docs (Strict Private)
-- Path structure: {user_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-docs', 'verification-docs', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Verification upload by owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

CREATE POLICY "Verification read by owner or admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-docs' AND
    (auth.uid() = (storage.foldername(name))[1]::uuid OR is_admin())
  );

CREATE POLICY "Verification update by owner" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'verification-docs' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

CREATE POLICY "Verification delete by owner" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verification-docs' AND
    auth.uid() = (storage.foldername(name))[1]::uuid
  );