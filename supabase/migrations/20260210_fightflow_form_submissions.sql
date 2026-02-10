-- Fight Flow Form Submissions Table
CREATE TABLE IF NOT EXISTS fightflow_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wix_contact_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  subject TEXT,
  submitted_at TIMESTAMPTZ NOT NULL,
  source TEXT DEFAULT 'wix_form_poll',
  status TEXT DEFAULT 'new',
  alerted BOOLEAN DEFAULT FALSE,
  auto_responded BOOLEAN DEFAULT FALSE,
  auto_response_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying new/unprocessed submissions
CREATE INDEX IF NOT EXISTS idx_fightflow_submissions_status ON fightflow_form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_fightflow_submissions_submitted ON fightflow_form_submissions(submitted_at DESC);

-- RLS policies
ALTER TABLE fightflow_form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON fightflow_form_submissions
  FOR ALL USING (true) WITH CHECK (true);
