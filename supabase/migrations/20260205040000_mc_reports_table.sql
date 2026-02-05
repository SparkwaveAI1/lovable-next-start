-- MC Reports Table for Mission Control
-- Created: 2026-02-05
-- Stores hourly summaries, health checks, weekly reports, and activity logs

-- Report Type enum
CREATE TYPE mc_report_type AS ENUM (
  'hourly_summary',
  'health_check', 
  'weekly_report',
  'activity_log'
);

-- Reports table
CREATE TABLE mc_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type mc_report_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  metadata JSONB DEFAULT '{}', -- Structured data (task counts, health status, etc.)
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mc_reports_type ON mc_reports(type);
CREATE INDEX idx_mc_reports_created_at ON mc_reports(created_at DESC);
CREATE INDEX idx_mc_reports_business_id ON mc_reports(business_id);

-- Enable Row Level Security
ALTER TABLE mc_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users full access)
CREATE POLICY "Allow authenticated read mc_reports" ON mc_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert mc_reports" ON mc_reports
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow service role full access (for backend operations)
CREATE POLICY "Allow service role full access mc_reports" ON mc_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime for mc_reports
ALTER PUBLICATION supabase_realtime ADD TABLE mc_reports;

COMMENT ON TABLE mc_reports IS 'Mission Control reports and logs repository';
COMMENT ON COLUMN mc_reports.type IS 'Type of report: hourly_summary, health_check, weekly_report, activity_log';
COMMENT ON COLUMN mc_reports.content IS 'Markdown formatted report content';
COMMENT ON COLUMN mc_reports.metadata IS 'Structured data like task counts, health status, agent activity';
