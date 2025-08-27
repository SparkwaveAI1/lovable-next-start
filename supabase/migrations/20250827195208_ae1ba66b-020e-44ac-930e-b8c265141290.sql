-- Create webhook_endpoints table
CREATE TABLE public.webhook_endpoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    endpoint_slug VARCHAR(100) NOT NULL UNIQUE,
    webhook_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    secret_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Webhook endpoints are publicly readable" 
ON public.webhook_endpoints 
FOR SELECT 
USING (true);

-- Add webhook endpoint for Fight Flow Academy
INSERT INTO webhook_endpoints (business_id, endpoint_slug, webhook_type, secret_key)
SELECT b.id, 'fight-flow-wix-forms', 'wix_form', 'secure_webhook_key_123'
FROM businesses b WHERE b.slug = 'fight-flow-academy';