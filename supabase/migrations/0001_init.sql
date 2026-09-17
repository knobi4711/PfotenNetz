-- =============================================================================
-- PfotenNetz – Basisschema
-- =============================================================================
-- Dieses Skript legt alle Tabellen, Row Level Security (RLS) und die
-- automatische Profil-Erstellung an. Es ist idempotent: mehrfaches Ausführen
-- ist gefahrlos möglich.
--
-- Ausführen:
--   Supabase Dashboard -> SQL Editor -> New query -> Inhalt einfügen -> Run
--
-- Alternativ über die Supabase CLI:
--   supabase db push
-- =============================================================================

-- gen_random_uuid() (pgcrypto) ist in Supabase bereits aktiv – zur Sicherheit:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tabelle: Öffentliche Profile (verknüpft mit Supabase Auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    location TEXT
);

-- -----------------------------------------------------------------------------
-- 2. Tabelle: Tiere
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    species TEXT NOT NULL, -- z. B. Hund, Katze, Nagetier
    notes TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 3. Tabelle: Hilfe-Gesuche
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'completed'
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Status auf die in der App erlaubten Werte begrenzen (idempotent).
ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE public.requests
    ADD CONSTRAINT requests_status_check
    CHECK (status IN ('open', 'in_progress', 'completed'));

-- -----------------------------------------------------------------------------
-- Indizes für die häufigsten Abfragen (Listen nach Besitzer/Ersteller)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS pets_owner_id_idx ON public.pets (owner_id);
CREATE INDEX IF NOT EXISTS pets_created_at_idx ON public.pets (created_at DESC);
CREATE INDEX IF NOT EXISTS requests_created_by_idx ON public.requests (created_by);
CREATE INDEX IF NOT EXISTS requests_status_idx ON public.requests (status);
CREATE INDEX IF NOT EXISTS requests_created_at_idx ON public.requests (created_at DESC);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS) aktivieren
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Basis-Sicherheitsrichtlinien (RLS Policies)
-- -----------------------------------------------------------------------------
-- `DROP POLICY IF EXISTS` + `CREATE POLICY` macht das Skript wiederholbar.

DROP POLICY IF EXISTS "Öffentlich lesbar" ON public.profiles;
CREATE POLICY "Öffentlich lesbar"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Eigenes Profil bearbeiten" ON public.profiles;
CREATE POLICY "Eigenes Profil bearbeiten"
    ON public.profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Tiere öffentlich lesbar" ON public.pets;
CREATE POLICY "Tiere öffentlich lesbar"
    ON public.pets FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Eigene Tiere verwalten" ON public.pets;
CREATE POLICY "Eigene Tiere verwalten"
    ON public.pets FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Gesuche öffentlich lesbar" ON public.requests;
CREATE POLICY "Gesuche öffentlich lesbar"
    ON public.requests FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Eigene Gesuche verwalten" ON public.requests;
CREATE POLICY "Eigene Gesuche verwalten"
    ON public.requests FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- -----------------------------------------------------------------------------
-- Automatische Profil-Erstellung bei der Registrierung
-- -----------------------------------------------------------------------------
-- Ohne diesen Trigger müsste die App das Profil selbst anlegen. Das schlägt
-- fehl, solange die E-Mail-Adresse noch nicht bestätigt ist (RLS blockiert den
-- Insert ohne Session). Der Trigger läuft als `SECURITY DEFINER` und legt das
-- Profil deshalb zuverlässig direkt beim Anlegen des Auth-Nutzers an.
--
-- `full_name` und `location` kommen aus den User-Metadaten, die die App bei
-- `supabase.auth.signUp({ options: { data: { ... } } })` mitgibt.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, location)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Neues Mitglied'),
        NULLIF(TRIM(NEW.raw_user_meta_data ->> 'location'), '')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Fertig. Prüfen mit:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- Erwartet: pets, profiles, requests
-- -----------------------------------------------------------------------------
