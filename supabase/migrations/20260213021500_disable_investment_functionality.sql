-- Migration: Disable Investment Functionality
-- Created: 2026-02-13
-- Purpose: Remove/disable all investment-related functionality to reduce API calls and DB load
-- This turns the investments page into a static mockup only

-- =============================================================================
-- DISABLE CRON JOBS
-- =============================================================================

-- Remove market data refresh cron job
SELECT cron.unschedule('market-data-refresh-15m')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'market-data-refresh-15m');

-- Remove investment alerts evaluator cron job  
SELECT cron.unschedule('evaluate-investment-alerts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-investment-alerts');

-- =============================================================================
-- DROP HELPER FUNCTIONS (make them no-op instead)
-- =============================================================================

-- Replace refresh_market_data with no-op version
CREATE OR REPLACE FUNCTION refresh_market_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- No-op: Investment functionality disabled
  RAISE NOTICE 'Investment functionality disabled - refresh_market_data is now a no-op';
END;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON FUNCTION refresh_market_data IS 'NO-OP: Investment functionality disabled. This function does nothing.';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Investment functionality disabled:';
  RAISE NOTICE '- market-data-refresh-15m cron job removed';
  RAISE NOTICE '- evaluate-investment-alerts cron job removed';
  RAISE NOTICE '- refresh_market_data function converted to no-op';
  RAISE NOTICE '- UI will show static mockup only';
END $$;