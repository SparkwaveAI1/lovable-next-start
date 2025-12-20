-- Make campaign_id and subscriber_id nullable for direct contact emails
ALTER TABLE public.email_sends 
ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE public.email_sends 
ALTER COLUMN subscriber_id DROP NOT NULL;