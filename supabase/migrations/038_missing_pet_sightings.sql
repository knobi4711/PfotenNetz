-- Community sightings for active missing-pet reports.
CREATE TABLE missing_pet_sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missing_pet_id UUID NOT NULL REFERENCES missing_pets(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_missing_pet_sightings_report ON missing_pet_sightings(missing_pet_id, created_at DESC);
CREATE INDEX idx_missing_pet_sightings_location ON missing_pet_sightings USING GIST (location);

CREATE TRIGGER update_missing_pet_sightings_updated_at
  BEFORE UPDATE ON missing_pet_sightings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE missing_pet_sightings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sightings are readable for active reports" ON missing_pet_sightings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM missing_pets mp
      WHERE mp.id = missing_pet_id
        AND mp.status = 'active'
    )
  );

CREATE POLICY "Users create own sightings" ON missing_pet_sightings
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users manage own sightings" ON missing_pet_sightings
  FOR UPDATE USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users delete own sightings" ON missing_pet_sightings
  FOR DELETE USING (reporter_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('missing-pet-photos', 'missing-pet-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Missing sighting photo upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'missing-pet-photos'
    AND EXISTS (
      SELECT 1 FROM public.missing_pet_sightings s
      WHERE s.id = split_part(name, '/', 1)::uuid
        AND s.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Missing sighting photo read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'missing-pet-photos');

GRANT SELECT, INSERT, UPDATE, DELETE ON missing_pet_sightings TO authenticated;
