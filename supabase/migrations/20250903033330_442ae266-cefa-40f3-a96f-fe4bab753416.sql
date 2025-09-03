-- Fix security vulnerability: Remove public write access to scheduled_content
DROP POLICY IF EXISTS "Scheduled content is publicly writable" ON scheduled_content;
DROP POLICY IF EXISTS "Scheduled content can be updated" ON scheduled_content;

-- Add proper service role access for scheduled content
CREATE POLICY "Service role full access on scheduled_content" ON scheduled_content
FOR ALL USING (auth.role() = 'service_role');

-- Keep read access for dashboard viewing but restrict writes
CREATE POLICY "Public read access for scheduled_content" ON scheduled_content
FOR SELECT USING (true);