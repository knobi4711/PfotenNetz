-- Notifications for the helper response / owner decision stages.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'booking_helper_response';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'booking_helper_rejected';
