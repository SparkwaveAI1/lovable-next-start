-- Migration: Market Data Refresh Log
-- Created: 2026-02-05
-- Purpose: Track scheduled market data refresh jobs for monitoring

-- =============================================================================
-- TABLE: market_data_refresh_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_data_refresh_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ DEFAULT now(),
  symbols_refreshed INTEGER DEFAULT 0,
  stocks_refreshed INTEGER DEFAULT 0,
  crypto_refreshed INTEGER DEFAULT 0,
  total_requested INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  duration_ms INTEGER DEFAULT 0
);

-- Index for querying recent runs
CREATE INDEX IF NOT EXISTS idx_market_data_refresh_log_run_at 
  ON market_data_refresh_log (run_at DESC);

-- RLS (service role only - this is an internal monitoring table)
ALTER TABLE market_data_refresh_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write
CREATE POLICY "Service role only" ON market_data_refresh_log
  FOR ALL USING (auth.role() = 'service_role');

-- Cleanup: Keep only last 30 days of logs (optional auto-cleanup via scheduled job)
COMMENT ON TABLE market_data_refresh_log IS 'Logs for market data refresh cron job. Auto-cleanup recommended after 30 days.';
