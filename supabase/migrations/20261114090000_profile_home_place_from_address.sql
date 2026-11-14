-- Ortsname der Kopfzeile auch dann fuellen, wenn die Adresse nicht ueber die
-- Standortbestimmung, sondern ueber das Profilformular gespeichert wird.
--
-- Bisher schrieb nur updateOwnLocation() aus apps/mobile das Feld
-- profiles.home_place. Der RPC save_own_private_address() speicherte Adresse und
-- Postleitzahl, liess home_place aber unberuehrt. Wer sein Profil nach der
-- Migration 20261113120000_profile_home_place.sql gespeichert hat, sah deshalb
-- keinen Ortsnamen in der Kopfzeile.
--
-- Ableitung wie im urspruenglichen Backfill: Ortsname hinter der fuenfstelligen
-- Postleitzahl. Ein bereits gespeicherter Wert bleibt erhalten, weil das
-- Reverse-Geocoding der App praeziser ist (Stadtteil statt Stadt).

CREATE OR REPLACE FUNCTION public.save_own_private_address(p_address TEXT, p_postal_code TEXT)
RETURNS VOID AS $$
DECLARE
  derived_place TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_address IS NULL OR char_length(BTRIM(p_address)) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'Address must contain between 5 and 300 characters';
  END IF;
  IF p_postal_code IS NULL OR p_postal_code !~ '^[0-9]{5}$' THEN
    RAISE EXCEPTION 'A valid five-digit postal code is required';
  END IF;

  derived_place := NULLIF(BTRIM(SUBSTRING(BTRIM(p_address) FROM '[0-9]{5}[[:space:]]+(.+)$')), '');
  IF derived_place IS NOT NULL AND char_length(derived_place) > 80 THEN
    derived_place := NULL;
  END IF;

  UPDATE public.profiles
  SET postal_code = p_postal_code,
      home_place = COALESCE(home_place, derived_place)
  WHERE id = auth.uid();

  INSERT INTO public.private_profile_addresses (profile_id, exact_address)
  VALUES (auth.uid(), BTRIM(p_address))
  ON CONFLICT (profile_id) DO UPDATE
    SET exact_address = EXCLUDED.exact_address, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.save_own_private_address(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_own_private_address(TEXT, TEXT) TO authenticated;

-- Nachtrag fuer Profile, deren Adresse erst nach dem Backfill vom 13.11.2026
-- gespeichert wurde.
UPDATE public.profiles p
SET home_place = NULLIF(BTRIM(SUBSTRING(pa.exact_address FROM '[0-9]{5}[[:space:]]+(.+)$')), '')
FROM public.private_profile_addresses pa
WHERE pa.profile_id = p.id
  AND p.home_place IS NULL
  AND char_length(BTRIM(SUBSTRING(pa.exact_address FROM '[0-9]{5}[[:space:]]+(.+)$')))
      BETWEEN 1 AND 80;
