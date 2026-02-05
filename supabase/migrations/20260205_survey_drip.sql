-- Survey Drip Sequence Tracking
-- Tracks which drip emails have been sent to each survey respondent

CREATE TABLE IF NOT EXISTS survey_drip_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  survey_completed_at TIMESTAMPTZ NOT NULL,
  tier TEXT NOT NULL, -- automation_ready, growth_mode, foundation_first, early_explorer
  
  -- Drip email tracking (NULL = not sent, timestamp = sent at)
  drip_day2_sent_at TIMESTAMPTZ,
  drip_day5_sent_at TIMESTAMPTZ,
  drip_day9_sent_at TIMESTAMPTZ,
  drip_day14_sent_at TIMESTAMPTZ,
  
  -- Status
  unsubscribed BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(contact_id)
);

-- Index for finding pending drips
CREATE INDEX idx_survey_drip_pending ON survey_drip_status (survey_completed_at, completed) 
  WHERE completed = FALSE AND unsubscribed = FALSE;

-- Index by contact
CREATE INDEX idx_survey_drip_contact ON survey_drip_status (contact_id);

-- Function to get contacts needing drip emails
CREATE OR REPLACE FUNCTION get_pending_survey_drips(p_limit INT DEFAULT 50)
RETURNS TABLE (
  drip_id UUID,
  contact_id UUID,
  email TEXT,
  first_name TEXT,
  tier TEXT,
  pain_points JSONB,
  magic_wand TEXT,
  survey_completed_at TIMESTAMPTZ,
  pending_drip_day INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as drip_id,
    d.contact_id,
    c.email::TEXT,
    c.first_name::TEXT,
    d.tier::TEXT,
    COALESCE((c.metadata->'audit_answers'->'pain_points'), '[]'::jsonb) as pain_points,
    COALESCE(c.metadata->>'magic_wand', c.metadata->'audit_answers'->>'magic_wand', '') as magic_wand,
    d.survey_completed_at,
    CASE
      -- Day 2: 48+ hours since survey, not yet sent
      WHEN d.drip_day2_sent_at IS NULL 
           AND d.survey_completed_at <= NOW() - INTERVAL '48 hours'
      THEN 2
      -- Day 5: 5+ days since survey, day2 sent, day5 not sent
      WHEN d.drip_day5_sent_at IS NULL 
           AND d.drip_day2_sent_at IS NOT NULL
           AND d.survey_completed_at <= NOW() - INTERVAL '5 days'
      THEN 5
      -- Day 9: 9+ days since survey, day5 sent, day9 not sent
      WHEN d.drip_day9_sent_at IS NULL 
           AND d.drip_day5_sent_at IS NOT NULL
           AND d.survey_completed_at <= NOW() - INTERVAL '9 days'
      THEN 9
      -- Day 14: 14+ days since survey, day9 sent, day14 not sent
      WHEN d.drip_day14_sent_at IS NULL 
           AND d.drip_day9_sent_at IS NOT NULL
           AND d.survey_completed_at <= NOW() - INTERVAL '14 days'
      THEN 14
      ELSE NULL
    END as pending_drip_day
  FROM survey_drip_status d
  JOIN contacts c ON c.id = d.contact_id
  WHERE d.completed = FALSE
    AND d.unsubscribed = FALSE
    AND c.email IS NOT NULL
    AND c.email_status = 'subscribed'
    -- Must have at least one pending drip
    AND (
      (d.drip_day2_sent_at IS NULL AND d.survey_completed_at <= NOW() - INTERVAL '48 hours')
      OR (d.drip_day5_sent_at IS NULL AND d.drip_day2_sent_at IS NOT NULL AND d.survey_completed_at <= NOW() - INTERVAL '5 days')
      OR (d.drip_day9_sent_at IS NULL AND d.drip_day5_sent_at IS NOT NULL AND d.survey_completed_at <= NOW() - INTERVAL '9 days')
      OR (d.drip_day14_sent_at IS NULL AND d.drip_day9_sent_at IS NOT NULL AND d.survey_completed_at <= NOW() - INTERVAL '14 days')
    )
  ORDER BY d.survey_completed_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark a drip as sent
CREATE OR REPLACE FUNCTION mark_drip_sent(p_drip_id UUID, p_day INT)
RETURNS VOID AS $$
BEGIN
  UPDATE survey_drip_status
  SET 
    updated_at = NOW(),
    drip_day2_sent_at = CASE WHEN p_day = 2 THEN NOW() ELSE drip_day2_sent_at END,
    drip_day5_sent_at = CASE WHEN p_day = 5 THEN NOW() ELSE drip_day5_sent_at END,
    drip_day9_sent_at = CASE WHEN p_day = 9 THEN NOW() ELSE drip_day9_sent_at END,
    drip_day14_sent_at = CASE WHEN p_day = 14 THEN NOW() ELSE drip_day14_sent_at END,
    -- Mark completed if day 14 was just sent
    completed = CASE WHEN p_day = 14 THEN TRUE ELSE completed END
  WHERE id = p_drip_id;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE survey_drip_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on survey_drip_status" ON survey_drip_status
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE survey_drip_status IS 'Tracks email drip sequence progress for survey respondents';
