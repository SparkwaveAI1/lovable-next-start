-- Fix RLS policy for anonymous survey submissions
-- Drop the existing policy that's not working
DROP POLICY IF EXISTS "Allow anonymous insert" ON sparkwave_survey_responses;

-- Create a policy that allows inserts from any role (including anon)
CREATE POLICY "Allow public insert" ON sparkwave_survey_responses
  FOR INSERT 
  WITH CHECK (true);

-- Alternative: Enable inserts without authentication
-- This is safe because the table is write-only for public
ALTER TABLE sparkwave_survey_responses FORCE ROW LEVEL SECURITY;
