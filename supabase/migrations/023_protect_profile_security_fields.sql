-- RLS limits users to their own row, but column-level protection is also
-- required: users must never self-promote role/trust_level or rewrite identity.

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted server operations (migrations/service role/auth trigger) have no
  -- authenticated user id and remain able to provision or administer profiles.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Profile id must match authenticated user';
    END IF;
    IF NEW.role IS DISTINCT FROM 'user' OR NEW.trust_level IS DISTINCT FROM 'basic' THEN
      RAISE EXCEPTION 'Role and trust level are server-managed';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.email IS DISTINCT FROM OLD.email OR
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.trust_level IS DISTINCT FROM OLD.trust_level OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Identity, role and trust level are server-managed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_security_fields_before_write ON public.profiles;
CREATE TRIGGER protect_profile_security_fields_before_write
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();

REVOKE ALL ON FUNCTION public.protect_profile_security_fields() FROM PUBLIC;
