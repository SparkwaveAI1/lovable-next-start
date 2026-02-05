-- Migration: Market Data Refresh Cron Job
-- Created: 2026-02-05
-- Purpose: Schedule market data refresh every 15 minutes via pg_cron + pg_net
-- Note: Run manual step below to insert service role key into vault

-- =============================================================================
-- HELPER FUNCTION: Refresh market data
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_market_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key TEXT;
  response_id BIGINT;
BEGIN
  -- Get service role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
  
  IF service_key IS NULL THEN
    RAISE NOTICE 'Service role key not found in vault. Skipping refresh.';
    RETURN;
  END IF;
  
  -- Call the Edge Function via pg_net
  SELECT net.http_post(
    url := 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/market-data-refresh',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000  -- 5 minute timeout
  ) INTO response_id;
  
  RAISE NOTICE 'Market data refresh triggered. Request ID: %', response_id;
END;
$$;

-- =============================================================================
-- CRON JOB SETUP
-- =============================================================================

-- First, unschedule if exists (for idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('market-data-refresh-15m');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, that's fine
  NULL;
END;
$$;

-- Schedule the refresh job every 15 minutes
SELECT cron.schedule(
  'market-data-refresh-15m',
  '*/15 * * * *',
  'SELECT refresh_market_data();'
);

-- =============================================================================
-- MANUAL STEP REQUIRED
-- =============================================================================
-- Run this in Supabase SQL Editor (not in migration) to add the service key:
-- 
-- INSERT INTO vault.secrets (name, secret)
-- VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE');
--
-- This keeps the key out of version control.
-- =============================================================================

COMMENT ON FUNCTION refresh_market_data IS 'Calls market-data-refresh Edge Function. Used by pg_cron.';
