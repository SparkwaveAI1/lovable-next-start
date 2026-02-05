-- Migration: Alert Evaluator Cron Job
-- Created: 2026-02-05
-- Runs the alert evaluator every 5 minutes during market hours

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('evaluate-investment-alerts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-investment-alerts');

-- Create the cron job to evaluate alerts every 5 minutes
-- Runs 24/7 since crypto markets never close
-- For stocks-only, you'd want to limit to market hours (9:30 AM - 4:00 PM EST)
SELECT cron.schedule(
  'evaluate-investment-alerts',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/alert-evaluator/evaluate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  )
  $$
);

-- Log that cron was set up
DO $$
BEGIN
  RAISE NOTICE 'Alert evaluator cron job scheduled: every 5 minutes';
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - runs alert evaluator';
