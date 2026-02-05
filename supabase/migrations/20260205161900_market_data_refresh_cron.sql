-- Migration: Market Data Refresh Cron Job
-- Created: 2026-02-05
-- Purpose: Schedule market data refresh every 15 minutes via pg_cron + pg_net

-- Note: pg_cron and pg_net extensions are already enabled on this Supabase project

-- =============================================================================
-- CRON JOB SETUP
-- =============================================================================

-- First, unschedule if exists (for idempotency)
SELECT cron.unschedule('market-data-refresh-15m') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'market-data-refresh-15m');

-- Schedule the refresh job every 15 minutes
-- Uses pg_net to call the Edge Function with service role key
SELECT cron.schedule(
  'market-data-refresh-15m',  -- job name
  '*/15 * * * *',              -- every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/market-data-refresh',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000  -- 5 minute timeout
  );
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Used for scheduled market data refresh (every 15 min)';
