UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/aac'
]
WHERE id = 'booking-chat-media';
