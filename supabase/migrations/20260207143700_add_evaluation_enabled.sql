-- Add evaluation_enabled flag to agent_config
-- Enables/disables the self-improvement evaluation loop per business

ALTER TABLE public.agent_config
ADD COLUMN IF NOT EXISTS evaluation_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.agent_config.evaluation_enabled IS 
'When true, AI responses go through a self-improvement evaluation loop that checks for relevance, accuracy, and appropriateness before sending.';

-- Enable evaluation for Fight Flow Academy by default
UPDATE public.agent_config
SET evaluation_enabled = true
WHERE business_id IN (
  SELECT id FROM public.businesses WHERE slug = 'fight-flow-academy'
);
