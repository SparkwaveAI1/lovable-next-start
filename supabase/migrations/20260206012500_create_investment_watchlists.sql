-- Migration: Create investment watchlists tables
-- Date: 2026-02-06
-- Description: Tables for user investment watchlists with RLS

-- ============================================
-- INVESTMENT_WATCHLISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investment_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    symbols TEXT[] DEFAULT '{}',  -- Array of ticker symbols for quick access
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON investment_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_business ON investment_watchlists(business_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_default ON investment_watchlists(user_id, is_default) WHERE is_default = TRUE;

-- ============================================
-- INVESTMENT_WATCHLIST_ITEMS TABLE
-- For additional metadata per symbol
-- ============================================
CREATE TABLE IF NOT EXISTS investment_watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES investment_watchlists(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    notes TEXT,
    target_price DECIMAL(12, 2),
    alert_above DECIMAL(12, 2),
    alert_below DECIMAL(12, 2),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(watchlist_id, symbol)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist ON investment_watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_symbol ON investment_watchlist_items(symbol);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_investment_watchlists_updated_at ON investment_watchlists;
CREATE TRIGGER update_investment_watchlists_updated_at
    BEFORE UPDATE ON investment_watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_investment_watchlist_items_updated_at ON investment_watchlist_items;
CREATE TRIGGER update_investment_watchlist_items_updated_at
    BEFORE UPDATE ON investment_watchlist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE investment_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_watchlist_items ENABLE ROW LEVEL SECURITY;

-- Watchlists policies
-- Users can view their own watchlists
CREATE POLICY "Users can view own watchlists"
    ON investment_watchlists
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own watchlists
CREATE POLICY "Users can create own watchlists"
    ON investment_watchlists
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlists
CREATE POLICY "Users can update own watchlists"
    ON investment_watchlists
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watchlists
CREATE POLICY "Users can delete own watchlists"
    ON investment_watchlists
    FOR DELETE
    USING (auth.uid() = user_id);

-- Watchlist items policies
-- Users can view items in their watchlists
CREATE POLICY "Users can view own watchlist items"
    ON investment_watchlist_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM investment_watchlists
            WHERE id = watchlist_id AND user_id = auth.uid()
        )
    );

-- Users can insert items into their watchlists
CREATE POLICY "Users can add items to own watchlists"
    ON investment_watchlist_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM investment_watchlists
            WHERE id = watchlist_id AND user_id = auth.uid()
        )
    );

-- Users can update items in their watchlists
CREATE POLICY "Users can update own watchlist items"
    ON investment_watchlist_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM investment_watchlists
            WHERE id = watchlist_id AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM investment_watchlists
            WHERE id = watchlist_id AND user_id = auth.uid()
        )
    );

-- Users can delete items from their watchlists
CREATE POLICY "Users can delete own watchlist items"
    ON investment_watchlist_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM investment_watchlists
            WHERE id = watchlist_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE investment_watchlists IS 'User-created watchlists for tracking investment symbols';
COMMENT ON TABLE investment_watchlist_items IS 'Individual symbols within watchlists with metadata';
COMMENT ON COLUMN investment_watchlists.symbols IS 'Denormalized array of symbols for quick retrieval';
COMMENT ON COLUMN investment_watchlist_items.target_price IS 'User-defined target price for the symbol';
COMMENT ON COLUMN investment_watchlist_items.alert_above IS 'Alert when price goes above this value';
COMMENT ON COLUMN investment_watchlist_items.alert_below IS 'Alert when price goes below this value';
