-- Message Approval Queue
-- Routes high-stakes messages for human review before sending

CREATE TABLE IF NOT EXISTS message_approval_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  contact_id UUID REFERENCES contacts(id),
  channel VARCHAR(20) NOT NULL, -- 'sms' or 'email'
  message_type VARCHAR(50), -- 'initial_outreach', 're_engagement', 'follow_up'
  
  -- Message content
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),
  subject VARCHAR(255),
  message_body TEXT NOT NULL,
  
  -- Review status
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, expired
  review_reason TEXT, -- Why it was flagged for review
  
  -- Review metadata
  reviewed_by VARCHAR(100), -- 'human', 'auto-approved', etc
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Auto-reject if not reviewed by this time
  sent_at TIMESTAMPTZ, -- When actually sent (if approved)
  
  -- Context
  contact_name VARCHAR(255),
  recent_message_count INT,
  last_message_direction VARCHAR(10),
  flags TEXT[] -- ['first_contact', 'dormant_14d', 'bad_pattern', etc]
);

-- Index for quick queries
CREATE INDEX idx_message_approval_status ON message_approval_queue(status, created_at DESC);
CREATE INDEX idx_message_approval_business ON message_approval_queue(business_id, status);
CREATE INDEX idx_message_approval_contact ON message_approval_queue(contact_id);

-- RLS policies
ALTER TABLE message_approval_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view queue (simplified)
CREATE POLICY "Authenticated users can view approval queue" ON message_approval_queue
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update (approve/reject)
CREATE POLICY "Authenticated users can update approval queue" ON message_approval_queue
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access to approval queue" ON message_approval_queue
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE message_approval_queue IS 'Holds messages flagged for human review before sending';
