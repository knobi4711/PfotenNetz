-- Restore the configured administrators and prevent helper verification from
-- demoting an existing administrator.

UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE LOWER(TRIM(email)) IN (
  'knoblauch@web.de',
  'steffanie.hobusch@ggoglemail.com',
  'hobusch@posteo.de'
);

CREATE OR REPLACE FUNCTION public.admin_review_helper_verification(
  p_verification_id UUID,
  p_status verification_status,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS public.verifications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_verification public.verifications;
  v_approved_count INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can review helper verifications';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Verification status must be approved or rejected';
  END IF;

  UPDATE public.verifications
  SET status = p_status, reviewed_by = auth.uid(), reviewed_at = NOW(),
    rejection_reason = CASE WHEN p_status = 'rejected' THEN NULLIF(TRIM(p_rejection_reason), '') ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_verification_id
    AND type IN ('id_document', 'liability_insurance') AND status = 'pending'
  RETURNING * INTO v_verification;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pending helper verification not found'; END IF;

  SELECT COUNT(*) INTO v_approved_count FROM public.verifications
  WHERE user_id = v_verification.user_id
    AND type IN ('id_document', 'liability_insurance') AND status = 'approved';

  IF v_approved_count = 2 THEN
    UPDATE public.profiles
    SET role = CASE WHEN role = 'admin' THEN 'admin' ELSE 'helper' END,
      trust_level = 'silver', updated_at = NOW()
    WHERE id = v_verification.user_id;
  END IF;
  RETURN v_verification;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_helper_verification(UUID, verification_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_helper_verification(UUID, verification_status, TEXT) TO authenticated;
