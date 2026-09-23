-- PfotenNetz Database Migration 002: Pets

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'rabbit', 'guinea_pig', 'bird', 'other')),
  breed TEXT,
  birth_date DATE,
  weight_kg NUMERIC(5,2),
  color TEXT,
  microchip_number TEXT UNIQUE,
  tattoo_number TEXT,
  insurance_policy TEXT,
  vet_clinic TEXT,
  vet_phone TEXT,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergies TEXT[],
  special_needs TEXT,
  emergency_card JSONB NOT NULL DEFAULT '{}'::jsonb,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pets_owner ON pets(owner_id);
CREATE INDEX idx_pets_species ON pets(species);
CREATE INDEX idx_pets_microchip ON pets(microchip_number) WHERE microchip_number IS NOT NULL;

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own pets" ON pets
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Policy "Helpers view pets of active bookings" moved to 003_bookings.sql
-- (requires bookings table to exist)