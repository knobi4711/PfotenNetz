-- A helper who accepted a request moves the booking to `awaiting_seeker`.
-- Both participants must still see each other's profile in that state,
-- otherwise the seeker cannot see who accepted and the helper appears as "–".
DROP POLICY IF EXISTS "Booking participant profile details" ON public.profiles;
CREATE POLICY "Booking participant profile details" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
        AND (b.seeker_id = profiles.id OR b.helper_id = profiles.id)
        AND b.status IN (
          'requested',
          'awaiting_seeker',
          'confirmed',
          'in_progress',
          'completed',
          'cancelled',
          'disputed'
        )
    )
  );

-- Pet photos are private, but the visible booking states must match the pet
-- row policy. Without `requested` and `awaiting_seeker` the photo URL cannot
-- be signed while an open request waits for the owner's confirmation.
DROP POLICY IF EXISTS "Pet photo read by participants" ON storage.objects;
CREATE POLICY "Pet photo read by participants" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-photos'
    AND EXISTS (
      SELECT 1
      FROM public.bookings AS b
      JOIN public.pets AS p ON p.id = b.pet_id
      WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
        AND (
          b.seeker_id = auth.uid()
          OR b.helper_id = auth.uid()
          OR (
            b.status = 'requested'
            AND b.helper_id IS NULL
            AND public.helper_matches_open_booking(b.id)
          )
        )
        AND b.status IN (
          'requested',
          'awaiting_seeker',
          'confirmed',
          'in_progress',
          'completed',
          'cancelled',
          'disputed'
        )
    )
  );
