-- Create audit_results table for Automation Audit webhook submissions
CREATE TABLE IF NOT EXISTS public.audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  company_name TEXT,
  
  -- Scores
  total_score INTEGER NOT NULL,
  lead_capture_score INTEGER,
  sales_process_score INTEGER,
  client_communication_score INTEGER,
  operations_score INTEGER,
  marketing_score INTEGER,
  
  -- Analysis
  weakest_domain TEXT,
  grade TEXT,
  grade_label TEXT,
  
  -- Raw data
  raw_responses JSONB,
  conditional_responses JSONB,
  
  -- Tracking
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  followup_sent_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  
  -- Source tracking
  form_id TEXT,
  source TEXT DEFAULT 'typeform'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_results_email ON public.audit_results(contact_email);
CREATE INDEX IF NOT EXISTS idx_audit_results_score ON public.audit_results(total_score);
CREATE INDEX IF NOT EXISTS idx_audit_results_weakest ON public.audit_results(weakest_domain);
CREATE INDEX IF NOT EXISTS idx_audit_results_created ON public.audit_results(created_at DESC);

-- RLS policies
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.audit_results
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.audit_results IS 'Stores Automation Audit form submissions from Typeform/Tally webhooks';
