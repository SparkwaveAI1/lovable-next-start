-- Create businesses table with proper structure
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    parent_business_id UUID REFERENCES public.businesses(id),
    business_type VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access for now (you can restrict later)
CREATE POLICY "Businesses are publicly readable" 
ON public.businesses 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the businesses data
INSERT INTO public.businesses (name, slug, parent_business_id, business_type, description) VALUES
    ('Fight Flow Academy', 'fight-flow-academy', NULL, 'martial_arts', 'Martial arts training and community'),
    ('Sparkwave AI', 'sparkwave-ai', NULL, 'ai_services', 'AI automation solutions');

-- Insert child businesses (PersonaAI and CharX under Sparkwave)
INSERT INTO public.businesses (name, slug, parent_business_id, business_type, description) 
SELECT 'PersonaAI', 'persona-ai', b.id, 'ai_app', 'AI-powered persona generation'
FROM public.businesses b WHERE b.slug = 'sparkwave-ai';

INSERT INTO public.businesses (name, slug, parent_business_id, business_type, description) 
SELECT 'CharX World', 'charx-world', b.id, 'ai_app', 'Character creation platform'
FROM public.businesses b WHERE b.slug = 'sparkwave-ai';