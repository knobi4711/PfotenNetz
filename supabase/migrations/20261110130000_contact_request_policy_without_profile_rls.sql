-- Fix: contact requests could no longer be sent by anyone.
--
-- The INSERT policy checked the recipient with a subquery on public.profiles:
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = helper_id AND role IN (...) ...)
-- Policy subqueries run with the caller's rights, so the profiles RLS applies.
-- Since 20261021102000_private_booking_locations.sql dropped the
-- "Verified helpers public" read policy, authenticated users can only read their
-- own profile row. The EXISTS therefore always evaluated to FALSE and every
-- insert was rejected with 42501 ("new row violates row-level security policy").
--
-- The check now lives in a SECURITY DEFINER function that only answers the
-- yes/no question and never exposes profile data (email/phone/location stay
-- hidden, which is exactly what the privacy migration was about).

CREATE OR REPLACE FUNCTION public.profile_accepts_contact_requests(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_profile_id
      AND role IN ('helper', 'admin')
      AND trust_level IN ('silver', 'gold')
  );
$$;

REVOKE ALL ON FUNCTION public.profile_accepts_contact_requests(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_accepts_contact_requests(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can create contact requests" ON public.contact_requests;
CREATE POLICY "Users can create contact requests" ON public.contact_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND public.profile_accepts_contact_requests(helper_id)
  );
