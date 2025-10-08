-- Add INSERT policy for scheduled_content table
CREATE POLICY "Public insert access for scheduled_content"
ON public.scheduled_content
FOR INSERT
WITH CHECK (true);