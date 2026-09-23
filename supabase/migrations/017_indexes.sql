-- PfotenNetz Database Migration 017: Additional Performance Indexes
-- Only NEW indexes not already defined in earlier migrations

-- Composite indexes for common query patterns on bookings (NEW)
CREATE INDEX idx_bookings_seeker_status ON bookings(seeker_id, status);
CREATE INDEX idx_bookings_helper_status ON bookings(helper_id, status);
CREATE INDEX idx_bookings_pet_status ON bookings(pet_id, status);
CREATE INDEX idx_bookings_time_status ON bookings(start_at, end_at, status);

-- Timebank indexes (idx_timebank_tx_user_time, idx_timebank_tx_reference already in 010)
-- NEW: user_reference composite for refund/lookups
CREATE INDEX idx_timebank_tx_user_reference ON timebank_transactions(user_id, reference_type, reference_id);
-- type_time already in 010

-- Partial indexes for common filters (NEW - not in earlier migrations)
CREATE INDEX idx_pets_active ON pets(owner_id) WHERE is_active = true;
-- idx_helper_availabilities_active already in 012