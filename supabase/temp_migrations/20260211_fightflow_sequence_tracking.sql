-- Fight Flow Sequence Tracking
-- Tracks individual SMS sequence steps for each lead

CREATE TABLE IF NOT EXISTS fightflow_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES fightflow_form_submissions(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL, -- day_minus_1, day_0, day_plus_1, day_plus_3, day_plus_7
  scheduled_for TIMESTAMPTZ NOT NULL, -- When this step should be sent
  sent_at TIMESTAMPTZ, -- When it was actually sent (null = not sent yet)
  sms_sid TEXT, -- Twilio SMS ID for tracking
  status TEXT DEFAULT 'pending', -- pending, sent, failed, skipped
  error_message TEXT,
  message_content TEXT, -- The actual message that was sent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sequence_steps_submission ON fightflow_sequence_steps(submission_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_scheduled ON fightflow_sequence_steps(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_status ON fightflow_sequence_steps(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_steps_unique ON fightflow_sequence_steps(submission_id, step_name);

-- Update trigger
CREATE OR REPLACE FUNCTION update_sequence_step_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sequence_step_timestamp
  BEFORE UPDATE ON fightflow_sequence_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_sequence_step_timestamp();

-- Add trial_date and sequence_status to form submissions
ALTER TABLE fightflow_form_submissions 
ADD COLUMN IF NOT EXISTS trial_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sequence_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

-- Update the updated_at trigger for form submissions
CREATE OR REPLACE FUNCTION update_form_submission_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_form_submission_timestamp ON fightflow_form_submissions;
CREATE TRIGGER trigger_update_form_submission_timestamp
  BEFORE UPDATE ON fightflow_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_form_submission_timestamp();

-- RLS policies
ALTER TABLE fightflow_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sequence_steps" ON fightflow_sequence_steps
  FOR ALL USING (true) WITH CHECK (true);

-- Helper function to initialize sequence for a new submission
CREATE OR REPLACE FUNCTION initialize_trial_sequence(
  submission_uuid UUID,
  trial_datetime TIMESTAMPTZ DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  trial_date TIMESTAMPTZ;
BEGIN
  -- Default to 3 days from now if no trial date provided
  trial_date := COALESCE(trial_datetime, NOW() + INTERVAL '3 days');
  
  -- Update the submission with trial date
  UPDATE fightflow_form_submissions 
  SET trial_date = trial_date,
      sequence_status = 'active'
  WHERE id = submission_uuid;
  
  -- Insert sequence steps
  INSERT INTO fightflow_sequence_steps (submission_id, step_name, scheduled_for) VALUES
    (submission_uuid, 'day_minus_1', trial_date - INTERVAL '1 day'),
    (submission_uuid, 'day_0', trial_date),
    (submission_uuid, 'day_plus_1', trial_date + INTERVAL '1 day'),
    (submission_uuid, 'day_plus_3', trial_date + INTERVAL '3 days'),
    (submission_uuid, 'day_plus_7', trial_date + INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Function to get pending sequence steps that are due
CREATE OR REPLACE FUNCTION get_pending_sequence_steps()
RETURNS TABLE (
  step_id UUID,
  submission_id UUID,
  step_name TEXT,
  scheduled_for TIMESTAMPTZ,
  first_name TEXT,
  phone TEXT,
  trial_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.submission_id,
    s.step_name,
    s.scheduled_for,
    f.first_name,
    f.phone,
    f.trial_date
  FROM fightflow_sequence_steps s
  JOIN fightflow_form_submissions f ON s.submission_id = f.id
  WHERE s.status = 'pending'
    AND s.scheduled_for <= NOW()
    AND f.sequence_status = 'active'
    AND f.phone IS NOT NULL
    -- Business hours check (9 AM - 7 PM ET)
    AND EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/New_York') BETWEEN 9 AND 18
  ORDER BY s.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql;