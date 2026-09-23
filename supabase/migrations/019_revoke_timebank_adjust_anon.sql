-- Prevent anonymous clients from directly executing the SECURITY DEFINER
-- timebank_adjust() RPC. Internal SECURITY DEFINER calls from
-- helper_complete_booking() remain unaffected.

REVOKE EXECUTE ON FUNCTION timebank_adjust(
    UUID,
    NUMERIC,
    timebank_tx_type,
    TEXT,
    UUID,
    TEXT,
    JSONB
) FROM anon;
