-- Create market_ohlcv_cache table for TradingView chart data caching
CREATE TABLE IF NOT EXISTS market_ohlcv_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  days INTEGER NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint for cache key
  CONSTRAINT market_ohlcv_cache_unique UNIQUE (symbol, asset_type, days)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_market_ohlcv_cache_lookup 
ON market_ohlcv_cache (symbol, asset_type, days);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_market_ohlcv_cache_expires 
ON market_ohlcv_cache (expires_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_market_ohlcv_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS market_ohlcv_cache_updated_at ON market_ohlcv_cache;
CREATE TRIGGER market_ohlcv_cache_updated_at
  BEFORE UPDATE ON market_ohlcv_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_market_ohlcv_cache_updated_at();

-- Enable RLS
ALTER TABLE market_ohlcv_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to market_ohlcv_cache"
ON market_ohlcv_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read cached data
CREATE POLICY "Authenticated users can read market_ohlcv_cache"
ON market_ohlcv_cache
FOR SELECT
TO authenticated
USING (true);

COMMENT ON TABLE market_ohlcv_cache IS 'Cache for OHLCV candlestick data used by TradingView charts';
COMMENT ON COLUMN market_ohlcv_cache.data IS 'JSONB array of OHLCV objects: [{time, open, high, low, close, volume}]';
