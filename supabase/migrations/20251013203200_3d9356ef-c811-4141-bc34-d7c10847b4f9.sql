-- Create agent configurations table
CREATE TABLE IF NOT EXISTS public.agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    system_prompt TEXT NOT NULL,
    knowledge_base TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_business_config UNIQUE (business_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_config_business ON public.agent_configurations(business_id);

-- Enable RLS (authenticated users can access)
ALTER TABLE public.agent_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view configs"
ON public.agent_configurations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can edit configs"
ON public.agent_configurations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER set_agent_config_updated_at
BEFORE UPDATE ON public.agent_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();