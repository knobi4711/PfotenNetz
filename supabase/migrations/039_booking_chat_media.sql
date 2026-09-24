INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-chat-media', 'booking-chat-media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Booking participants upload chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'booking-chat-media'
    AND split_part(name, '/', 2) = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = split_part(name, '/', 1)::uuid
        AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants read chat media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'booking-chat-media'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = split_part(name, '/', 1)::uuid
        AND (b.seeker_id = auth.uid() OR b.helper_id = auth.uid())
    )
  );
