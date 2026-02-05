-- Migration: Market Refresh Config Table (alternative to vault)
-- Created: 2026-02-05
-- Purpose: Store service key for pg_cron job to use

-- =============================================================================
-- CONFIG TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS _internal_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Strict RLS - no access except via functions
ALTER TABLE _internal_config ENABLE ROW LEVEL SECURITY;

-- No policies = no access from API, only from SECURITY DEFINER functions

-- =============================================================================
-- UPDATE THE REFRESH FUNCTION to use config table
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
  -- Get service role key from config table
  SELECT value INTO service_key
  FROM _internal_config
  WHERE key = 'service_role_key'
  LIMIT 1;
  
  IF service_key IS NULL THEN
    RAISE NOTICE 'Service role key not found in _internal_config. Skipping refresh.';
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
    timeout_milliseconds := 300000
  ) INTO response_id;
  
  RAISE NOTICE 'Market data refresh triggered. Request ID: %', response_id;
END;
$$;

COMMENT ON TABLE _internal_config IS 'Internal config for scheduled jobs. Not exposed via API.';
