-- Seed a "test" tag for all existing businesses
-- This ensures every business has at least one predefined tag for testing

INSERT INTO public.contact_tags (business_id, name, slug, color, is_active)
SELECT id, 'Test', 'test', 'blue', true
FROM public.businesses
ON CONFLICT (business_id, slug) DO NOTHING;
