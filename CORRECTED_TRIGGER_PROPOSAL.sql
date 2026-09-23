-- Korrigierte Trigger-Funktion für public.handle_new_user()
-- Kompatibel mit aktuellem public.profiles Schema (Stand: 2026-09-20)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_display_name text;
    v_location geography(POINT, 4326);
BEGIN
    -- display_name bestimmen: Priorität display_name > full_name > Default
    v_display_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
        'Neues Mitglied'
    );

    -- location nur übernehmen, wenn valides Geography-Objekt in Metadaten vorliegt
    -- Erwartet Format: {"type":"Point","coordinates":[lon,lat]} oder WKT
    BEGIN
        IF (NEW.raw_user_meta_data ? 'location') AND (NEW.raw_user_meta_data ->> 'location') IS NOT NULL THEN
            -- Versuche, location als WKT oder GeoJSON zu parsen
            v_location := ST_GeomFromGeoJSON(NEW.raw_user_meta_data ->> 'location')::geography(POINT, 4326);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ungültige location wird ignoriert, bleibt NULL
        v_location := NULL;
    END;

    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        location,
        -- role, trust_level, kiez_radius_km, notification_prefs, timezone, language, onboarding_completed
        -- werden über Defaults befüllt
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_display_name,
        v_location,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$function$;

-- Bestehender Trigger bleibt unverändert:
-- CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();