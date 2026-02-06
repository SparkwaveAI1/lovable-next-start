-- AI Response Logs
-- Tracks all AI-generated responses for quality auditing

CREATE TABLE IF NOT EXISTS ai_response_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  contact_id UUID REFERENCES contacts(id),
  
  -- Input
  input_message TEXT NOT NULL,
  input_channel VARCHAR(20), -- 'sms', 'email', 'chat'
  
  -- AI Processing
  model_used VARCHAR(100), -- 'gpt-4', 'gpt-3.5-turbo', etc
  intents_detected TEXT[], -- ['SCHEDULE_INQUIRY', 'PRICING_QUESTION']
  knowledge_used TEXT[], -- Which KB items were referenced
  
  -- Output
  response_text TEXT NOT NULL,
  response_length INT,
  
  -- Quality indicators
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  patterns_flagged TEXT[], -- Any warnings from bad-patterns check
  required_review BOOLEAN DEFAULT FALSE,
  
  -- Review (if reviewed)
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(100),
  review_rating VARCHAR(20), -- 'good', 'acceptable', 'poor', 'incorrect'
  review_notes TEXT,
  
  -- Metadata
  response_time_ms INT, -- How long AI took
  tokens_used INT,
  cost_cents DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Outcome tracking
  contact_replied BOOLEAN,
  contact_booked BOOLEAN,
  contact_opted_out BOOLEAN
);

-- Indexes for auditing
CREATE INDEX idx_ai_logs_business_date ON ai_response_logs(business_id, created_at DESC);
CREATE INDEX idx_ai_logs_needs_review ON ai_response_logs(required_review, reviewed_at) WHERE required_review = TRUE;
CREATE INDEX idx_ai_logs_rating ON ai_response_logs(review_rating) WHERE review_rating IS NOT NULL;

-- RLS
ALTER TABLE ai_response_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view AI logs" ON ai_response_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access to AI logs" ON ai_response_logs
  FOR ALL USING (true);

COMMENT ON TABLE ai_response_logs IS 'Tracks all AI responses for quality auditing and improvement';
