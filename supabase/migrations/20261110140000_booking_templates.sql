-- PfotenNetz Migration: Wiederverwendbare Betreuungsvorlagen
--
-- Wer regelmäßig dieselbe Betreuung anfragt, muss Tiere, Leistung, Vergütung,
-- Treffpunkt und Hinweise nicht bei jeder Anfrage neu eingeben. Am Ende des
-- Betreuungsformulars lassen sich die aktuellen Angaben unter einem Namen als
-- Vorlage speichern. Vorlagen gehören genau einem Nutzer und werden nur für
-- neue Anfragen angeboten; der Zeitraum wird bewusst nicht gespeichert, weil er
-- bei jeder Betreuung neu gewählt werden muss.

CREATE TABLE public.booking_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pet_ids UUID[] NOT NULL,
  type public.booking_type NOT NULL,
  care_location TEXT NOT NULL DEFAULT 'at_owner_home',
  currency public.currency NOT NULL DEFAULT 'KIEZ_HOURS',
  price_eur_cents INT NOT NULL DEFAULT 0,
  price_kiez_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  meeting_address TEXT,
  care_notes TEXT,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  tracking_radius_m INT NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_templates_name_length
    CHECK (char_length(BTRIM(name)) BETWEEN 1 AND 60),
  CONSTRAINT booking_templates_pets
    CHECK (cardinality(pet_ids) BETWEEN 1 AND 20),
  CONSTRAINT booking_templates_care_location
    CHECK (care_location IN ('at_owner_home', 'at_owner_home_live_in', 'at_helper_home')),
  CONSTRAINT booking_templates_prices
    CHECK (price_eur_cents >= 0 AND price_kiez_hours >= 0),
  CONSTRAINT booking_templates_tracking_radius
    CHECK (tracking_radius_m BETWEEN 100 AND 10000),
  CONSTRAINT booking_templates_address_length
    CHECK (meeting_address IS NULL OR char_length(meeting_address) <= 300),
  CONSTRAINT booking_templates_notes_length
    CHECK (care_notes IS NULL OR char_length(care_notes) <= 2000),
  -- Saving a template with an existing name updates that template instead of
  -- creating a duplicate; the client upserts on this pair.
  CONSTRAINT booking_templates_owner_name_unique UNIQUE (owner_id, name)
);

CREATE INDEX booking_templates_owner_idx
  ON public.booking_templates(owner_id, updated_at DESC);

CREATE TRIGGER update_booking_templates_updated_at
  BEFORE UPDATE ON public.booking_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.booking_templates ENABLE ROW LEVEL SECURITY;

-- Templates are private. Every statement is limited to the owning user, so no
-- other profile can read addresses, notes or selected pets from a template.
CREATE POLICY "Users read own booking templates"
  ON public.booking_templates FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users create own booking templates"
  ON public.booking_templates FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users update own booking templates"
  ON public.booking_templates FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users delete own booking templates"
  ON public.booking_templates FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

REVOKE ALL ON public.booking_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_templates TO authenticated;
