-- Fix mc_tasks delete permission for authenticated users
-- This allows authenticated users to delete tasks from the Mission Control UI

CREATE POLICY "Allow authenticated delete mc_tasks" 
ON mc_tasks 
FOR DELETE 
TO authenticated
USING (true);

-- Also ensure mc_activities can be inserted by authenticated users for logging task deletions
-- (This should already exist but let's make sure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mc_activities' 
    AND policyname = 'Allow authenticated insert mc_activities' 
    AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Allow authenticated insert mc_activities" 
    ON mc_activities 
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);
  END IF;
END
$$;