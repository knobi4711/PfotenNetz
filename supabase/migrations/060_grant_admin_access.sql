-- Grant administrator access to the requested existing accounts.
-- The update is intentionally idempotent so the migration is safe to replay.
UPDATE public.profiles
SET
  role = 'admin',
  updated_at = NOW()
WHERE LOWER(TRIM(email)) IN (
  'knoblauch@web.de',
  'steffanie.hobusch@ggoglemail.com'
);
