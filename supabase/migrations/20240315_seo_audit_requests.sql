-- Create SEO audit requests table
CREATE TABLE IF NOT EXISTS seo_audit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  website TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  audit_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS
ALTER TABLE seo_audit_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own audit requests
CREATE POLICY "Anyone can request an audit" ON seo_audit_requests
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow service role to read all audit requests
CREATE POLICY "Service role can read all audits" ON seo_audit_requests
  FOR SELECT TO service_role
  USING (true);

-- Allow service role to update audit requests
CREATE POLICY "Service role can update audits" ON seo_audit_requests
  FOR UPDATE TO service_role
  USING (true);