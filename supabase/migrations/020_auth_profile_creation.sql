-- Create the application profile in the same transaction as an auth signup.
-- This also works when email confirmation is enabled and the client does not
-- receive an authenticated session immediately.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
      'PfotenNetz-Mitglied'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_profile_after_auth_signup ON auth.users;
CREATE TRIGGER create_profile_after_auth_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Repair users created before the trigger existed without changing profiles
-- that were already completed manually.
INSERT INTO public.profiles (id, email, display_name)
SELECT
  users.id,
  users.email,
  COALESCE(
    NULLIF(BTRIM(users.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(SPLIT_PART(users.email, '@', 1), ''),
    'PfotenNetz-Mitglied'
  )
FROM auth.users AS users
LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
WHERE profiles.id IS NULL
  AND users.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
