-- Market History Cache Table
-- Used by market-data-service edge function to cache historical price data for sparklines

CREATE TABLE IF NOT EXISTS market_history_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  days integer NOT NULL DEFAULT 7,
  data jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Unique constraint on symbol + asset_type + days for upsert
  CONSTRAINT market_history_cache_symbol_type_days_unique UNIQUE (symbol, asset_type, days)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_market_history_cache_lookup 
  ON market_history_cache (symbol, asset_type, days, expires_at);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_market_history_cache_expires 
  ON market_history_cache (expires_at);

-- RLS policies
ALTER TABLE market_history_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cache
CREATE POLICY "Allow authenticated read" ON market_history_cache
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON market_history_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Comment
COMMENT ON TABLE market_history_cache IS 'Cache for historical price data from Polygon.io and CoinGecko APIs (24h TTL)';
