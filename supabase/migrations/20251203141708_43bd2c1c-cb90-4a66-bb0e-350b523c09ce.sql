-- Add reading_date column for when the indicator value was observed
ALTER TABLE public.crisis_indicators 
ADD COLUMN IF NOT EXISTS reading_date date;

-- Allow super admins to manage crisis indicators
CREATE POLICY "Super admins can manage crisis indicators"
ON public.crisis_indicators
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());