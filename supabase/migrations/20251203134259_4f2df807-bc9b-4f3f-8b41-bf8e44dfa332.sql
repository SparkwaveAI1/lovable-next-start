-- Create crisis_indicators table to store economic indicator data
CREATE TABLE public.crisis_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_key varchar NOT NULL UNIQUE,
  indicator_name varchar NOT NULL,
  value decimal,
  unit varchar,
  source varchar,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crisis_indicators ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Crisis indicators are publicly readable"
  ON public.crisis_indicators
  FOR SELECT
  USING (true);

-- Allow service role to update
CREATE POLICY "Service role can manage crisis indicators"
  ON public.crisis_indicators
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create index for fast lookups
CREATE INDEX idx_crisis_indicators_key ON public.crisis_indicators(indicator_key);