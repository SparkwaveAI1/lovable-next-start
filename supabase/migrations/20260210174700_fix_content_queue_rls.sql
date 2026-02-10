-- Fix RLS policies on content_queue to allow authenticated users to read/update

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read" ON content_queue;
DROP POLICY IF EXISTS "Allow authenticated update" ON content_queue;
DROP POLICY IF EXISTS "Allow service role all" ON content_queue;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON content_queue;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON content_queue;

-- Make sure RLS is enabled
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read content_queue
CREATE POLICY "Enable read for authenticated users"
ON content_queue
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to update content_queue  
CREATE POLICY "Enable update for authenticated users"
ON content_queue
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role has full access"
ON content_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
