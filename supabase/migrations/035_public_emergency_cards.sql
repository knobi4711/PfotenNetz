-- Short-lived, revocable links for emergency cards.
CREATE TABLE public.emergency_card_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX emergency_card_links_token_hash_idx ON public.emergency_card_links(token_hash);
ALTER TABLE public.emergency_card_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage emergency card links" ON public.emergency_card_links
  FOR ALL USING (EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.create_emergency_card_link(p_pet_id UUID, p_token TEXT)
RETURNS TABLE (id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE link_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pets WHERE pets.id = p_pet_id AND pets.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'pet_not_owned';
  END IF;
  INSERT INTO public.emergency_card_links (pet_id, token_hash)
  VALUES (p_pet_id, encode(digest(p_token, 'sha256'), 'hex'))
  RETURNING emergency_card_links.id, emergency_card_links.expires_at INTO link_id, expires_at;
  id := link_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_emergency_card(p_token TEXT)
RETURNS TABLE (
  name TEXT, species TEXT, breed TEXT, color TEXT, birth_date DATE,
  microchip_number TEXT, medications JSONB, allergies TEXT[], special_needs TEXT,
  vet_clinic TEXT, vet_phone TEXT, insurance_policy TEXT, avatar_url TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT p.name, p.species, p.breed, p.color, p.birth_date, p.microchip_number,
    p.medications, p.allergies, p.special_needs, p.vet_clinic, p.vet_phone,
    p.insurance_policy, p.avatar_url, l.expires_at
  FROM public.emergency_card_links l
  JOIN public.pets p ON p.id = l.pet_id
  WHERE l.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND l.revoked_at IS NULL AND l.expires_at > NOW() AND p.is_deceased = false;
$$;

CREATE OR REPLACE FUNCTION public.revoke_emergency_card_link(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.emergency_card_links l SET revoked_at = NOW()
  WHERE l.id = p_id AND EXISTS (
    SELECT 1 FROM public.pets p WHERE p.id = l.pet_id AND p.owner_id = auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_emergency_card(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_emergency_card(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_emergency_card_link(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_emergency_card_link(UUID) TO authenticated;
