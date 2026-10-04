-- Grant administrator access to the confirmed existing account.
-- The update is intentionally idempotent so the migration is safe to replay.
UPDATE public.profiles
SET
  role = 'admin',
  updated_at = NOW()
WHERE LOWER(TRIM(email)) = 'hobusch@posteo.de';
