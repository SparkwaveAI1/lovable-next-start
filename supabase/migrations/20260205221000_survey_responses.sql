-- Survey responses table for Sparkwave lead intake
CREATE TABLE IF NOT EXISTS sparkwave_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic info
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  
  -- Survey questions
  biggest_headache TEXT,
  hours_on_repetitive_tasks TEXT,
  current_tools TEXT,
  budget_range TEXT,
  timeline TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'web_survey',
  ip_address TEXT,
  user_agent TEXT,
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Index for quick lookups
CREATE INDEX idx_survey_responses_email ON sparkwave_survey_responses(contact_email);
CREATE INDEX idx_survey_responses_created ON sparkwave_survey_responses(created_at DESC);

-- Enable RLS
ALTER TABLE sparkwave_survey_responses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for public form submission)
CREATE POLICY "Allow anonymous insert" ON sparkwave_survey_responses
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated users to read all (for admin dashboard)
CREATE POLICY "Allow authenticated read" ON sparkwave_survey_responses
  FOR SELECT TO authenticated
  USING (true);

-- Allow service role full access
CREATE POLICY "Service role full access" ON sparkwave_survey_responses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE sparkwave_survey_responses IS 'Lead intake survey responses from website';
