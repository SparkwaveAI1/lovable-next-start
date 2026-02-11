-- Email Campaign Sequences
-- Created: 2026-02-10 for COMM-021
-- Purpose: Multi-email drip campaigns with delays

-- Sequence definitions
CREATE TABLE IF NOT EXISTS email_campaign_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'tags', 'segment', 'list')),
  target_tags TEXT[] DEFAULT '{}',
  target_segment_id UUID,
  target_list_id UUID REFERENCES email_lists(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual emails in a sequence
CREATE TABLE IF NOT EXISTS email_campaign_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_campaign_sequences(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  name TEXT, -- Optional step name
  subject TEXT NOT NULL,
  preview_text TEXT,
  content_html TEXT NOT NULL,
  content_text TEXT, -- Plain text version
  delay_value INTEGER NOT NULL DEFAULT 0, -- Delay amount
  delay_unit TEXT NOT NULL DEFAULT 'hours' CHECK (delay_unit IN ('minutes', 'hours', 'days', 'weeks')),
  delay_from TEXT NOT NULL DEFAULT 'previous' CHECK (delay_from IN ('enrollment', 'previous')),
  send_window_start TIME, -- Optional: only send between these times
  send_window_end TIME,
  skip_weekends BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

-- Track contacts enrolled in email sequences
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_campaign_sequences(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  current_step INTEGER DEFAULT 0, -- 0 = enrolled but not started
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'unsubscribed', 'bounced', 'cancelled')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_email_sent_at TIMESTAMPTZ,
  next_email_due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pause_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sequence_id, contact_id)
);

-- Track individual email sends within sequences
CREATE TABLE IF NOT EXISTS email_sequence_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES email_sequence_enrollments(id) ON DELETE CASCADE NOT NULL,
  step_id UUID REFERENCES email_campaign_sequence_steps(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  resend_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'skipped')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sequences_business ON email_campaign_sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_status ON email_campaign_sequences(status);
CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_sequence ON email_campaign_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_order ON email_campaign_sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_sequence ON email_sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_contact ON email_sequence_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_status ON email_sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_next_due ON email_sequence_enrollments(next_email_due_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_email_sequence_sends_enrollment ON email_sequence_sends(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_sends_status ON email_sequence_sends(status);

-- Enable RLS
ALTER TABLE email_campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sequences for their businesses" ON email_campaign_sequences
  FOR SELECT USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage sequences for their businesses" ON email_campaign_sequences
  FOR ALL USING (public.can_access_business(business_id))
  WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can view sequence steps" ON email_campaign_sequence_steps
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM email_campaign_sequences WHERE public.can_access_business(business_id)
    )
  );

CREATE POLICY "Users can manage sequence steps" ON email_campaign_sequence_steps
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM email_campaign_sequences WHERE public.can_access_business(business_id)
    )
  )
  WITH CHECK (
    sequence_id IN (
      SELECT id FROM email_campaign_sequences WHERE public.can_access_business(business_id)
    )
  );

CREATE POLICY "Users can view enrollments for their businesses" ON email_sequence_enrollments
  FOR SELECT USING (public.can_access_business(business_id));

CREATE POLICY "Users can manage enrollments for their businesses" ON email_sequence_enrollments
  FOR ALL USING (public.can_access_business(business_id))
  WITH CHECK (public.can_access_business(business_id));

CREATE POLICY "Users can view sequence sends" ON email_sequence_sends
  FOR SELECT USING (
    enrollment_id IN (
      SELECT id FROM email_sequence_enrollments WHERE public.can_access_business(business_id)
    )
  );

CREATE POLICY "Users can manage sequence sends" ON email_sequence_sends
  FOR ALL USING (
    enrollment_id IN (
      SELECT id FROM email_sequence_enrollments WHERE public.can_access_business(business_id)
    )
  )
  WITH CHECK (
    enrollment_id IN (
      SELECT id FROM email_sequence_enrollments WHERE public.can_access_business(business_id)
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to sequences" ON email_campaign_sequences
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to steps" ON email_campaign_sequence_steps
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to enrollments" ON email_sequence_enrollments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to sends" ON email_sequence_sends
  FOR ALL USING (auth.role() = 'service_role');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_email_sequence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_sequences_timestamp ON email_campaign_sequences;
CREATE TRIGGER update_email_sequences_timestamp
  BEFORE UPDATE ON email_campaign_sequences
  FOR EACH ROW EXECUTE FUNCTION update_email_sequence_timestamp();

DROP TRIGGER IF EXISTS update_email_sequence_steps_timestamp ON email_campaign_sequence_steps;
CREATE TRIGGER update_email_sequence_steps_timestamp
  BEFORE UPDATE ON email_campaign_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION update_email_sequence_timestamp();

DROP TRIGGER IF EXISTS update_email_enrollments_timestamp ON email_sequence_enrollments;
CREATE TRIGGER update_email_enrollments_timestamp
  BEFORE UPDATE ON email_sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_email_sequence_timestamp();

-- Function to calculate next email due time
CREATE OR REPLACE FUNCTION calculate_next_email_time(
  p_enrollment_id UUID
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_enrollment RECORD;
  v_current_step RECORD;
  v_next_step RECORD;
  v_base_time TIMESTAMPTZ;
  v_delay_interval INTERVAL;
BEGIN
  -- Get enrollment
  SELECT * INTO v_enrollment FROM email_sequence_enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  -- Get next step
  SELECT * INTO v_next_step 
  FROM email_campaign_sequence_steps 
  WHERE sequence_id = v_enrollment.sequence_id 
    AND step_order = v_enrollment.current_step + 1
    AND is_active = true;
  
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  -- Determine base time
  IF v_next_step.delay_from = 'enrollment' THEN
    v_base_time := v_enrollment.enrolled_at;
  ELSE
    v_base_time := COALESCE(v_enrollment.last_email_sent_at, v_enrollment.enrolled_at);
  END IF;
  
  -- Calculate delay interval
  v_delay_interval := CASE v_next_step.delay_unit
    WHEN 'minutes' THEN make_interval(mins => v_next_step.delay_value)
    WHEN 'hours' THEN make_interval(hours => v_next_step.delay_value)
    WHEN 'days' THEN make_interval(days => v_next_step.delay_value)
    WHEN 'weeks' THEN make_interval(weeks => v_next_step.delay_value)
    ELSE make_interval(hours => v_next_step.delay_value)
  END;
  
  RETURN v_base_time + v_delay_interval;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE email_campaign_sequences IS 'Multi-email drip campaign sequences';
COMMENT ON TABLE email_campaign_sequence_steps IS 'Individual emails within a sequence';
COMMENT ON TABLE email_sequence_enrollments IS 'Contacts enrolled in email sequences';
COMMENT ON TABLE email_sequence_sends IS 'Tracking for individual sequence email sends';