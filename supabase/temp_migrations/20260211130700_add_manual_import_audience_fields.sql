-- Add support for manual contact selection and imported contact lists to email campaigns
-- These columns will store the specific contacts for manual selection and import types

-- Add manual contact IDs (array of UUIDs referencing contacts table)
ALTER TABLE public.email_campaigns 
ADD COLUMN target_manual_contacts text[] DEFAULT '{}';

-- Add imported contact data (JSON array of contact objects)
ALTER TABLE public.email_campaigns 
ADD COLUMN target_imported_contacts jsonb DEFAULT '[]';

-- Add comments explaining the new columns
COMMENT ON COLUMN public.email_campaigns.target_manual_contacts IS 'Array of contact IDs for manual selection audience type';
COMMENT ON COLUMN public.email_campaigns.target_imported_contacts IS 'Array of contact objects {email, first_name, last_name} for import audience type';