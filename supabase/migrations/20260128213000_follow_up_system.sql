-- Follow-Up System Tables
-- Created: 2026-01-28
-- Purpose: Automated lead nurturing sequences

-- Sequence templates per business
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'new_lead', 'no_response', 'missed_class', 'attended_no_signup', 'conversation_dropped'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Steps within a sequence
CREATE TABLE IF NOT EXISTS follow_up_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  delay_hours INT NOT NULL DEFAULT 24, -- hours after enrollment (or previous step)
  delay_from TEXT DEFAULT 'enrollment', -- 'enrollment' or 'previous_step'
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  message_template TEXT NOT NULL,
  subject_template TEXT, -- for email only
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

-- Track contacts enrolled in sequences
CREATE TABLE IF NOT EXISTS contact_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  current_step INT DEFAULT 0, -- 0 = not started, 1 = first step sent, etc.
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'responded', 'cancelled')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_step_sent_at TIMESTAMPTZ,
  next_step_due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pause_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate enrollments in the same sequence
  UNIQUE(contact_id, sequence_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_business ON follow_up_sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_trigger ON follow_up_sequences(trigger_type);
CREATE INDEX IF NOT EXISTS idx_follow_up_steps_sequence ON follow_up_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_contact_follow_ups_status ON contact_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_contact_follow_ups_next_due ON contact_follow_ups(next_step_due_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contact_follow_ups_contact ON contact_follow_ups(contact_id);

-- Enable RLS
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow access based on business membership)
CREATE POLICY "Users can view sequences for their businesses" ON follow_up_sequences
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM user_business_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sequences for their businesses" ON follow_up_sequences
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_business_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view steps for their sequences" ON follow_up_steps
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM follow_up_sequences WHERE business_id IN (
        SELECT business_id FROM user_business_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage steps for their sequences" ON follow_up_steps
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM follow_up_sequences WHERE business_id IN (
        SELECT business_id FROM user_business_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view contact follow-ups for their businesses" ON contact_follow_ups
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM user_business_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage contact follow-ups for their businesses" ON contact_follow_ups
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM user_business_access WHERE user_id = auth.uid()
    )
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role full access to sequences" ON follow_up_sequences
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to steps" ON follow_up_steps
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to contact follow-ups" ON contact_follow_ups
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- DEFAULT SEQUENCES FOR FIGHT FLOW ACADEMY
-- =====================================================

-- Insert default "New Lead" sequence for Fight Flow
INSERT INTO follow_up_sequences (business_id, name, description, trigger_type, is_active)
SELECT 
  '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
  'New Lead Follow-Up',
  'Default follow-up sequence for new leads who don''t respond to initial contact',
  'new_lead',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM follow_up_sequences 
  WHERE business_id = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff' 
  AND trigger_type = 'new_lead'
);

-- Get the sequence ID and insert steps
DO $$
DECLARE
  seq_id UUID;
BEGIN
  SELECT id INTO seq_id FROM follow_up_sequences 
  WHERE business_id = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff' 
  AND trigger_type = 'new_lead'
  LIMIT 1;
  
  IF seq_id IS NOT NULL THEN
    -- Step 1: Day 1 SMS
    INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template)
    VALUES (seq_id, 1, 24, 'sms', 
      'Hey {{first_name}}! Just following up on your interest in Fight Flow Academy. Do you have any questions I can help answer? 🥊')
    ON CONFLICT (sequence_id, step_order) DO NOTHING;
    
    -- Step 2: Day 3 Email
    INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template, subject_template)
    VALUES (seq_id, 2, 72, 'email',
      '<p>Hi {{first_name}},</p><p>I wanted to reach out again about Fight Flow Academy. We offer a free trial class so you can experience our training firsthand.</p><p>Our schedule includes BJJ, Muay Thai, MMA, and more. What style interests you most?</p><p>Just reply to this email or text us back!</p><p>- Fight Flow Team</p>',
      'Still interested in martial arts, {{first_name}}?')
    ON CONFLICT (sequence_id, step_order) DO NOTHING;
    
    -- Step 3: Day 7 SMS (final)
    INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template)
    VALUES (seq_id, 3, 168, 'sms',
      'Hi {{first_name}}, last check-in from Fight Flow! If you''re still thinking about training, we''d love to have you. Our free trial is always available. No pressure - just let us know if you have questions! 💪')
    ON CONFLICT (sequence_id, step_order) DO NOTHING;
  END IF;
END $$;

-- Insert "Missed Class" sequence for Fight Flow
INSERT INTO follow_up_sequences (business_id, name, description, trigger_type, is_active)
SELECT 
  '456dc53b-d9d9-41b0-bc33-4f4c4a791eff',
  'Missed Class Follow-Up',
  'Follow-up for contacts who booked a class but didn''t show up',
  'missed_class',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM follow_up_sequences 
  WHERE business_id = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff' 
  AND trigger_type = 'missed_class'
);

DO $$
DECLARE
  seq_id UUID;
BEGIN
  SELECT id INTO seq_id FROM follow_up_sequences 
  WHERE business_id = '456dc53b-d9d9-41b0-bc33-4f4c4a791eff' 
  AND trigger_type = 'missed_class'
  LIMIT 1;
  
  IF seq_id IS NOT NULL THEN
    -- Step 1: Same day SMS (4 hours after class time)
    INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template)
    VALUES (seq_id, 1, 4, 'sms',
      'Hey {{first_name}}! We missed you at class today. No worries - life happens! Want to reschedule for another day this week? 🥊')
    ON CONFLICT (sequence_id, step_order) DO NOTHING;
    
    -- Step 2: Day 2 SMS
    INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template)
    VALUES (seq_id, 2, 48, 'sms',
      'Hi {{first_name}}, just checking in again. We have classes every day - what day works best for you to come try us out?')
    ON CONFLICT (sequence_id, step_order) DO NOTHING;
  END IF;
END $$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_follow_up_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_follow_up_sequences_timestamp ON follow_up_sequences;
CREATE TRIGGER update_follow_up_sequences_timestamp
  BEFORE UPDATE ON follow_up_sequences
  FOR EACH ROW EXECUTE FUNCTION update_follow_up_timestamp();

DROP TRIGGER IF EXISTS update_contact_follow_ups_timestamp ON contact_follow_ups;
CREATE TRIGGER update_contact_follow_ups_timestamp
  BEFORE UPDATE ON contact_follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_follow_up_timestamp();
