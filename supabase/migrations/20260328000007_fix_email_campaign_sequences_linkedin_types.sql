-- Migration: create email_campaign_sequences + steps tables
-- (previously blocked as .broken due to dependency issues — now fixed)
-- Also: these tables are already defined in linkedin migration so no re-create needed for linkedin
-- SPA-2777 audit fix

CREATE TABLE IF NOT EXISTS email_campaign_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_tags TEXT[] DEFAULT '{}',
  target_segment_id UUID,
  target_list_id UUID REFERENCES email_lists(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sequences_business_id ON email_campaign_sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_status ON email_campaign_sequences(status);

CREATE TABLE IF NOT EXISTS email_campaign_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_campaign_sequences(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  name TEXT,
  subject TEXT NOT NULL,
  preview_text TEXT,
  content_html TEXT NOT NULL,
  content_text TEXT,
  delay_value INTEGER NOT NULL DEFAULT 0,
  delay_unit TEXT NOT NULL DEFAULT 'hours',
  delay_from TEXT NOT NULL DEFAULT 'previous',
  send_window_start TIME,
  send_window_end TIME,
  skip_weekends BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_email_seq_steps_sequence_id ON email_campaign_sequence_steps(sequence_id);

-- RLS
ALTER TABLE email_campaign_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read email_campaign_sequences" ON email_campaign_sequences FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can write email_campaign_sequences" ON email_campaign_sequences FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update email_campaign_sequences" ON email_campaign_sequences FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access email_campaign_sequences" ON email_campaign_sequences FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE email_campaign_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read email_campaign_sequence_steps" ON email_campaign_sequence_steps FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can write email_campaign_sequence_steps" ON email_campaign_sequence_steps FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update email_campaign_sequence_steps" ON email_campaign_sequence_steps FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access email_campaign_sequence_steps" ON email_campaign_sequence_steps FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE email_campaign_sequences IS 'Multi-step drip email sequence definitions. Previously blocked as .broken migration — now unblocked.';
COMMENT ON TABLE email_campaign_sequence_steps IS 'Individual email steps within a drip sequence, with delay and send-window configuration.';
