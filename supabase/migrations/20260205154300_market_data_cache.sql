-- Market Data Cache Table
-- Used by market-data-service edge function to cache stock/crypto quotes

CREATE TABLE IF NOT EXISTS market_data_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  data jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Unique constraint on symbol + asset_type for upsert
  CONSTRAINT market_data_cache_symbol_type_unique UNIQUE (symbol, asset_type)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_market_data_cache_lookup 
  ON market_data_cache (symbol, asset_type, expires_at);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_market_data_cache_expires 
  ON market_data_cache (expires_at);

-- RLS policies
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cache
CREATE POLICY "Allow authenticated read" ON market_data_cache
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON market_data_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Comment
COMMENT ON TABLE market_data_cache IS 'Cache for market data from Polygon.io and CoinGecko APIs';
