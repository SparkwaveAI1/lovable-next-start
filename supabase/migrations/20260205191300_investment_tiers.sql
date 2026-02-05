-- Migration: Investment Subscription Tiers
-- Created: 2026-02-05
-- INV-073: Add subscription tier tracking for investment module

-- =============================================================================
-- ADD TIER COLUMN TO BUSINESSES
-- =============================================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS investment_tier TEXT DEFAULT 'free';

-- Ensure valid tier values
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_investment_tier_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_investment_tier_check 
  CHECK (investment_tier IN ('free', 'pro'));

-- Index for efficient tier-based queries
CREATE INDEX IF NOT EXISTS idx_businesses_investment_tier ON businesses(investment_tier);

-- =============================================================================
-- TABLE: investment_subscriptions (for Stripe tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS investment_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investment_subscriptions_business ON investment_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_investment_subscriptions_user ON investment_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_subscriptions_stripe ON investment_subscriptions(stripe_subscription_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_investment_subscriptions_updated_at ON investment_subscriptions;
CREATE TRIGGER update_investment_subscriptions_updated_at
  BEFORE UPDATE ON investment_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE investment_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON investment_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON investment_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON investment_subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON investment_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- FUNCTION: Get user's investment tier
-- =============================================================================
CREATE OR REPLACE FUNCTION get_investment_tier(p_business_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT;
BEGIN
  -- First check business tier
  IF p_business_id IS NOT NULL THEN
    SELECT investment_tier INTO v_tier
    FROM businesses
    WHERE id = p_business_id;
    
    IF v_tier = 'pro' THEN
      RETURN 'pro';
    END IF;
  END IF;
  
  -- Check subscription table for user-level override
  SELECT tier INTO v_tier
  FROM investment_subscriptions
  WHERE (business_id = p_business_id OR user_id = p_user_id)
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE tier WHEN 'pro' THEN 1 ELSE 2 END  -- prefer pro
  LIMIT 1;
  
  RETURN COALESCE(v_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Count user's watchlist items
-- =============================================================================
CREATE OR REPLACE FUNCTION count_watchlist_items(p_user_id UUID, p_business_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM watchlist_items wi
    JOIN investment_watchlists w ON w.id = wi.watchlist_id
    WHERE w.user_id = p_user_id
      AND (p_business_id IS NULL OR w.business_id = p_business_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Count user's watchlists
-- =============================================================================
CREATE OR REPLACE FUNCTION count_watchlists(p_user_id UUID, p_business_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM investment_watchlists
    WHERE user_id = p_user_id
      AND (p_business_id IS NULL OR business_id = p_business_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Count user's alerts
-- =============================================================================
CREATE OR REPLACE FUNCTION count_alerts(p_user_id UUID, p_business_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM investment_alerts
    WHERE user_id = p_user_id
      AND (p_business_id IS NULL OR business_id = p_business_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE investment_subscriptions IS 'Tracks investment module subscription status and Stripe integration';
COMMENT ON COLUMN businesses.investment_tier IS 'Investment module tier: free or pro';
COMMENT ON FUNCTION get_investment_tier IS 'Returns the effective investment tier for a business/user';
COMMENT ON FUNCTION count_watchlist_items IS 'Count total watchlist items for a user';
COMMENT ON FUNCTION count_watchlists IS 'Count total watchlists for a user';
COMMENT ON FUNCTION count_alerts IS 'Count total alerts for a user';
