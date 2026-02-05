-- Migration: Investment Module
-- Created: 2026-02-05
-- Tables: investment_watchlists, watchlist_items, investment_alerts, alert_events
-- Note: market_data_cache already exists from 20260205154300_market_data_cache.sql

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION (if not exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: investment_watchlists
-- =============================================================================
CREATE TABLE IF NOT EXISTS investment_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investment_watchlists_user_id ON investment_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_watchlists_business_id ON investment_watchlists(business_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_investment_watchlists_updated_at ON investment_watchlists;
CREATE TRIGGER update_investment_watchlists_updated_at
  BEFORE UPDATE ON investment_watchlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE investment_watchlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own watchlists" ON investment_watchlists;
CREATE POLICY "Users can view their own watchlists" ON investment_watchlists
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own watchlists" ON investment_watchlists;
CREATE POLICY "Users can insert their own watchlists" ON investment_watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own watchlists" ON investment_watchlists;
CREATE POLICY "Users can update their own watchlists" ON investment_watchlists
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own watchlists" ON investment_watchlists;
CREATE POLICY "Users can delete their own watchlists" ON investment_watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- TABLE: watchlist_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID REFERENCES investment_watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  added_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(watchlist_id, symbol)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_symbol ON watchlist_items(symbol);

-- RLS
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view items in their watchlists" ON watchlist_items;
CREATE POLICY "Users can view items in their watchlists" ON watchlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investment_watchlists w 
      WHERE w.id = watchlist_items.watchlist_id 
      AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert items to their watchlists" ON watchlist_items;
CREATE POLICY "Users can insert items to their watchlists" ON watchlist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM investment_watchlists w 
      WHERE w.id = watchlist_items.watchlist_id 
      AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update items in their watchlists" ON watchlist_items;
CREATE POLICY "Users can update items in their watchlists" ON watchlist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM investment_watchlists w 
      WHERE w.id = watchlist_items.watchlist_id 
      AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete items from their watchlists" ON watchlist_items;
CREATE POLICY "Users can delete items from their watchlists" ON watchlist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM investment_watchlists w 
      WHERE w.id = watchlist_items.watchlist_id 
      AND w.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TABLE: investment_alerts
-- =============================================================================
CREATE TABLE IF NOT EXISTS investment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  condition_json JSONB NOT NULL, -- {"indicator": "rsi_14", "operator": "lt", "value": 30}
  notification_config JSONB, -- {"email": true, "push": false}
  workflow_id UUID, -- Optional link to Sparkwave workflow
  is_active BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investment_alerts_user_id ON investment_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_business_id ON investment_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_symbol ON investment_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_is_active ON investment_alerts(is_active);

-- RLS
ALTER TABLE investment_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own alerts" ON investment_alerts;
CREATE POLICY "Users can view their own alerts" ON investment_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own alerts" ON investment_alerts;
CREATE POLICY "Users can insert their own alerts" ON investment_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own alerts" ON investment_alerts;
CREATE POLICY "Users can update their own alerts" ON investment_alerts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own alerts" ON investment_alerts;
CREATE POLICY "Users can delete their own alerts" ON investment_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- TABLE: alert_events
-- =============================================================================
CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES investment_alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  condition_snapshot JSONB, -- What values triggered it
  acknowledged BOOLEAN DEFAULT false,
  workflow_triggered BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_events_alert_id ON alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_triggered_at ON alert_events(triggered_at);

-- RLS
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events for their alerts" ON alert_events;
CREATE POLICY "Users can view events for their alerts" ON alert_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investment_alerts a 
      WHERE a.id = alert_events.alert_id 
      AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update events for their alerts" ON alert_events;
CREATE POLICY "Users can update events for their alerts" ON alert_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM investment_alerts a 
      WHERE a.id = alert_events.alert_id 
      AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage alert events" ON alert_events;
CREATE POLICY "Service role can manage alert events" ON alert_events
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE investment_watchlists IS 'User watchlists for tracking stocks and crypto';
COMMENT ON TABLE watchlist_items IS 'Individual symbols tracked in a watchlist';
COMMENT ON TABLE investment_alerts IS 'User-configured price/indicator alerts';
COMMENT ON TABLE alert_events IS 'History of triggered alerts';
