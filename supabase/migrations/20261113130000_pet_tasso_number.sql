-- Tasso-Zentralregister: Registrierungsnummer je Tier.
-- Die Tasso-Notrufnummer ist fuer alle Tiere gleich und wird deshalb nicht pro
-- Tier gespeichert, sondern als Konstante in der App angezeigt.
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS tasso_number TEXT;

ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_tasso_number_length;

ALTER TABLE public.pets
  ADD CONSTRAINT pets_tasso_number_length
  CHECK (tasso_number IS NULL OR char_length(BTRIM(tasso_number)) BETWEEN 1 AND 40);

-- Die oeffentliche Notfallkarte gibt die Tasso-Nummer mit aus. Der Rueckgabetyp
-- aendert sich, deshalb muss die Funktion vor dem Neuanlegen entfernt werden.
DROP FUNCTION IF EXISTS public.get_public_emergency_card(TEXT);

CREATE FUNCTION public.get_public_emergency_card(p_token TEXT)
RETURNS TABLE (
  name TEXT, species TEXT, breed TEXT, color TEXT, birth_date DATE,
  microchip_number TEXT, tasso_number TEXT, medications JSONB, allergies TEXT[], special_needs TEXT,
  vet_clinic TEXT, vet_phone TEXT, insurance_policy TEXT, avatar_url TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT p.name, p.species, p.breed, p.color, p.birth_date, p.microchip_number, p.tasso_number,
    p.medications, p.allergies, p.special_needs, p.vet_clinic, p.vet_phone,
    p.insurance_policy, p.avatar_url, l.expires_at
  FROM public.emergency_card_links l
  JOIN public.pets p ON p.id = l.pet_id
  WHERE l.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND l.revoked_at IS NULL AND l.expires_at > NOW() AND p.is_deceased = false;
$$;

REVOKE ALL ON FUNCTION public.get_public_emergency_card(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_emergency_card(TEXT) TO anon, authenticated;
