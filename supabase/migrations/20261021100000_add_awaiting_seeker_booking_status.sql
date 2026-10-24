-- The helper's response must be followed by the seeker's confirmation.
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'awaiting_seeker';
