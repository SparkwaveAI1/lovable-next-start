-- SMS Rate Limiting Table
-- Track when we last messaged each contact to prevent spam

CREATE TABLE IF NOT EXISTS contact_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'sms', -- 'sms', 'email'
  direction TEXT NOT NULL DEFAULT 'outbound', -- 'inbound', 'outbound'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_preview TEXT, -- First 100 chars for debugging
  
  -- Index for rate limit lookups
  CONSTRAINT unique_contact_message_log UNIQUE (contact_id, channel, direction, sent_at)
);

-- Index for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_contact_message_log_rate_check 
  ON contact_message_log(contact_id, channel, direction, sent_at DESC);

-- Function to check if we can message a contact (rate limiting)
CREATE OR REPLACE FUNCTION can_message_contact(
  p_contact_id UUID,
  p_channel TEXT DEFAULT 'sms',
  p_min_hours_between INT DEFAULT 24
) RETURNS BOOLEAN AS $$
DECLARE
  last_sent TIMESTAMPTZ;
BEGIN
  SELECT sent_at INTO last_sent
  FROM contact_message_log
  WHERE contact_id = p_contact_id
    AND channel = p_channel
    AND direction = 'outbound'
  ORDER BY sent_at DESC
  LIMIT 1;
  
  IF last_sent IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if enough time has passed
  RETURN (NOW() - last_sent) > (p_min_hours_between || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Add a sms_last_contacted column to contacts for quick checks
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_last_contacted TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_last_contacted TIMESTAMPTZ;

COMMENT ON TABLE contact_message_log IS 'Tracks all outbound messages for rate limiting';
COMMENT ON FUNCTION can_message_contact IS 'Returns TRUE if enough time has passed since last message';
