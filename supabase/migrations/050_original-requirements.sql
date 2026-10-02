-- Product requirements from Original.pdf
-- Legal copy must still be reviewed before production use.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS care_notes TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS profile_bio TEXT;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_care_notes_length CHECK (care_notes IS NULL OR char_length(care_notes) <= 2000);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_postal_code_format CHECK (
    postal_code IS NULL OR postal_code ~ '^[0-9]{5}$'
  );

CREATE INDEX IF NOT EXISTS idx_bookings_urgent_active
  ON public.bookings(is_urgent, start_at)
  WHERE is_urgent = true AND status IN ('requested', 'confirmed', 'in_progress');
