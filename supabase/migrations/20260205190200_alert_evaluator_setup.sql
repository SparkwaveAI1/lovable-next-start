-- Migration: Alert Evaluator Setup
-- Created: 2026-02-05
-- Tasks: INV-046 to INV-050
-- Description: Add trigger_count column, create helper RPC, set up pg_cron job

-- =============================================================================
-- ADD trigger_count COLUMN (INV-049)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_alerts' 
    AND column_name = 'trigger_count'
  ) THEN
    ALTER TABLE investment_alerts ADD COLUMN trigger_count INTEGER DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN investment_alerts.trigger_count IS 'Number of times this alert has been triggered';

-- =============================================================================
-- HELPER FUNCTION: Increment trigger count atomically
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_trigger_count(alert_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE investment_alerts 
  SET trigger_count = COALESCE(trigger_count, 0) + 1
  WHERE id = alert_id
  RETURNING trigger_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE RLS: Allow service role to insert alert_events
-- =============================================================================
-- Already handled in the base migration, but ensure it exists
DROP POLICY IF EXISTS "Service role can insert alert events" ON alert_events;
CREATE POLICY "Service role can insert alert events" ON alert_events
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role to update investment_alerts
DROP POLICY IF EXISTS "Service role can update alerts" ON investment_alerts;
CREATE POLICY "Service role can update alerts" ON investment_alerts
  FOR UPDATE
  USING (true);

-- =============================================================================
-- HELPER FUNCTION: Run alert evaluation
-- =============================================================================
CREATE OR REPLACE FUNCTION run_alert_evaluation()
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
    RAISE NOTICE 'Service role key not found in vault. Skipping alert evaluation.';
    RETURN;
  END IF;
  
  -- Call the Edge Function via pg_net
  SELECT net.http_post(
    url := 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/alert-evaluator/evaluate',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000  -- 2 minute timeout
  ) INTO response_id;
  
  RAISE NOTICE 'Alert evaluation triggered. Request ID: %', response_id;
END;
$$;

-- =============================================================================
-- pg_cron JOB: Run alert evaluation every 5 minutes
-- =============================================================================

-- First, unschedule if exists (for idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('alert-evaluator-5m');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, that's fine
  NULL;
END;
$$;

-- Schedule the alert-evaluator cron job every 5 minutes
SELECT cron.schedule(
  'alert-evaluator-5m',
  '*/5 * * * *',
  'SELECT run_alert_evaluation();'
);

-- =============================================================================
-- INDEX: Improve query performance for active alerts
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_investment_alerts_active_symbol 
  ON investment_alerts(is_active, symbol) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_alert_events_triggered_at_desc 
  ON alert_events(triggered_at DESC);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON FUNCTION increment_trigger_count IS 'Atomically increment the trigger count for an alert';
