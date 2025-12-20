-- ============================================
-- REMOVE UNUSED CREDENTIAL COLUMNS
-- ============================================
-- Twilio credentials are now stored in Edge Function secrets (environment variables)
-- These database columns are unused and could cause confusion or security concerns

-- Remove unused credential columns from sms_config
ALTER TABLE public.sms_config 
DROP COLUMN IF EXISTS account_sid,
DROP COLUMN IF EXISTS auth_token;

-- Add a comment explaining where credentials should be stored
COMMENT ON TABLE public.sms_config IS 'Business-specific SMS configuration. Note: Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) should be stored in Supabase Edge Function Secrets, NOT in this table.';