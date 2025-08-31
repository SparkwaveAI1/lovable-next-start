-- Create table for GoHighLevel configuration
CREATE TABLE public.ghl_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  location_id TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ghl_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "GHL configurations are publicly readable" 
ON public.ghl_configurations 
FOR SELECT 
USING (true);

CREATE POLICY "GHL configurations are publicly writable" 
ON public.ghl_configurations 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ghl_configurations_updated_at
BEFORE UPDATE ON public.ghl_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();