-- Add a fixed euro amount that is charged per visit.
ALTER TYPE currency ADD VALUE IF NOT EXISTS 'PER_VISIT';

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_price_exclusive;

ALTER TABLE bookings ADD CONSTRAINT chk_price_exclusive CHECK (
  (price_eur_cents > 0 AND price_kiez_hours = 0 AND currency::text IN ('EUR', 'PER_VISIT')) OR
  (price_eur_cents = 0 AND price_kiez_hours > 0 AND currency = 'KIEZ_HOURS') OR
  (price_eur_cents = 0 AND price_kiez_hours = 0 AND currency = 'KIEZ_HOURS')
);
