-- A requester can have at most one open introduction request per helper.
-- The partial unique index also protects against concurrent submissions.
CREATE UNIQUE INDEX contact_requests_one_pending_per_pair_idx
  ON public.contact_requests(requester_id, helper_id)
  WHERE status = 'pending';
