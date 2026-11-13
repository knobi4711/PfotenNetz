-- Ortsname des Tier-Zuhauses fuer die Kopfzeile.
-- Grossstadt: Stadtteil, Kleinstadt: Stadt, Land: Gemeinde. Der Wert wird beim
-- Speichern des Standorts aus dem Reverse-Geocoding abgeleitet und bleibt
-- getrennt von der exakten, privaten Profiladresse.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_place TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_home_place_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_home_place_length
  CHECK (home_place IS NULL OR char_length(BTRIM(home_place)) BETWEEN 1 AND 80);

-- Fallback fuer bestehende Profile: der Ort aus der bereits gespeicherten
-- Adresse. Beim naechsten Speichern des Tier-Zuhauses wird der praezisere
-- Stadtteil bzw. Gemeindename nachgezogen.
UPDATE public.profiles p
SET home_place = NULLIF(BTRIM(SUBSTRING(pa.exact_address FROM '[0-9]{5}[[:space:]]+(.+)$')), '')
FROM public.private_profile_addresses pa
WHERE pa.profile_id = p.id
  AND p.home_place IS NULL;
