CREATE POLICY "Automation logs are publicly writable" 
  ON public.automation_logs 
  FOR INSERT 
  WITH CHECK (true);