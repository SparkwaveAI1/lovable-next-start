-- Email Replies Table
-- Stores inbound email replies for tracking and notification

CREATE TABLE IF NOT EXISTS email_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender info
  from_email TEXT NOT NULL,
  from_name TEXT,
  
  -- Message details
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  
  -- Tracking
  original_campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  notified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  
  -- Raw payload for debugging
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_email_replies_status ON email_replies(status);
CREATE INDEX IF NOT EXISTS idx_email_replies_from ON email_replies(from_email);
CREATE INDEX IF NOT EXISTS idx_email_replies_received ON email_replies(received_at DESC);

-- RLS
ALTER TABLE email_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to email_replies"
  ON email_replies FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view email_replies"
  ON email_replies FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE email_replies IS 'Inbound email replies received via Resend webhook';
