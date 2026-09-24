-- Fix mutual RLS recursion between community_events and event_participants.
-- The helper functions run with the function owner's privileges and only
-- expose the boolean checks needed by the policies.
CREATE OR REPLACE FUNCTION public.is_community_event_participant(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_participants
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND status = 'going'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_event_organizer(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_events
    WHERE id = p_event_id
      AND organizer_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "Private events readable by participants" ON public.community_events;
CREATE POLICY "Private events readable by participants" ON public.community_events
  FOR SELECT USING (
    is_public = false
    AND (
      organizer_id = auth.uid()
      OR public.is_community_event_participant(id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizer views participants" ON public.event_participants;
CREATE POLICY "Organizer views participants" ON public.event_participants
  FOR SELECT USING (
    public.is_community_event_organizer(event_id, auth.uid())
  );

GRANT EXECUTE ON FUNCTION public.is_community_event_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_event_organizer(UUID, UUID) TO authenticated;
