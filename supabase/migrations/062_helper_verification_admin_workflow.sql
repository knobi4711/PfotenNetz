-- Admin workflow for reviewing helper verification requests.

CREATE OR REPLACE FUNCTION public.admin_list_helper_verifications()
RETURNS TABLE (
  verification_id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  profile_role TEXT,
  trust_level TEXT,
  verification_type verification_type,
  verification_status verification_status,
  storage_paths TEXT[],
  created_at TIMESTAMPTZ,
  rejection_reason TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can review helper verifications';
  END IF;

  RETURN QUERY
  SELECT v.id, v.user_id, p.email, p.display_name, p.role, p.trust_level,
    v.type, v.status, v.storage_paths, v.created_at, v.rejection_reason
  FROM public.verifications AS v
  JOIN public.profiles AS p ON p.id = v.user_id
  WHERE v.type IN ('id_document', 'liability_insurance') AND v.status = 'pending'
  ORDER BY v.created_at ASC;
END;
$$;

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
    UPDATE public.profiles SET role = 'helper', trust_level = 'silver', updated_at = NOW()
    WHERE id = v_verification.user_id;
  END IF;
  RETURN v_verification;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_helper_verifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_helper_verification(UUID, verification_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_helper_verifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_helper_verification(UUID, verification_status, TEXT) TO authenticated;
