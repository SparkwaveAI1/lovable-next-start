-- Screener Profiles Table
-- INV-036: Store user-defined and preset screening profiles

-- Create screener_profiles table
CREATE TABLE IF NOT EXISTS screener_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  logic TEXT NOT NULL DEFAULT 'AND' CHECK (logic IN ('AND', 'OR')),
  asset_types TEXT[] NOT NULL DEFAULT '{stock,crypto}',
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_screener_profiles_user_id ON screener_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_screener_profiles_business_id ON screener_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_screener_profiles_is_preset ON screener_profiles(is_preset);

-- Enable RLS
ALTER TABLE screener_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own profiles, business profiles, and presets
CREATE POLICY "Users can view own profiles and presets"
  ON screener_profiles FOR SELECT
  USING (
    is_preset = true 
    OR user_id = auth.uid() 
    OR business_id IN (
      SELECT bp.business_id FROM business_permissions bp 
      WHERE bp.user_id = auth.uid() AND bp.is_active = true
    )
  );

-- Users can create their own profiles
CREATE POLICY "Users can create own profiles"
  ON screener_profiles FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR business_id IN (
      SELECT bp.business_id FROM business_permissions bp 
      WHERE bp.user_id = auth.uid() 
      AND bp.is_active = true 
      AND bp.permission_level IN ('admin', 'manager', 'creator')
    )
  );

-- Users can update their own profiles (not presets)
CREATE POLICY "Users can update own profiles"
  ON screener_profiles FOR UPDATE
  USING (
    is_preset = false 
    AND (
      user_id = auth.uid() 
      OR business_id IN (
        SELECT bp.business_id FROM business_permissions bp 
        WHERE bp.user_id = auth.uid() 
        AND bp.is_active = true 
        AND bp.permission_level IN ('admin', 'manager', 'creator')
      )
    )
  );

-- Users can delete their own profiles (not presets)
CREATE POLICY "Users can delete own profiles"
  ON screener_profiles FOR DELETE
  USING (
    is_preset = false 
    AND (
      user_id = auth.uid() 
      OR business_id IN (
        SELECT bp.business_id FROM business_permissions bp 
        WHERE bp.user_id = auth.uid() 
        AND bp.is_active = true 
        AND bp.permission_level IN ('admin', 'manager')
      )
    )
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role full access"
  ON screener_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Insert preset screeners
INSERT INTO screener_profiles (name, description, rules, logic, asset_types, is_preset) VALUES
(
  'Oversold (RSI < 30)',
  'Find assets that may be oversold based on RSI indicator',
  '[{"field": "rsi_14", "operator": "lt", "value": 30}]'::jsonb,
  'AND',
  '{stock,crypto}',
  true
),
(
  'Overbought (RSI > 70)',
  'Find assets that may be overbought based on RSI indicator',
  '[{"field": "rsi_14", "operator": "gt", "value": 70}]'::jsonb,
  'AND',
  '{stock,crypto}',
  true
),
(
  'High Volume Breakout',
  'Assets with above-average volume and positive momentum',
  '[{"field": "volume_ratio", "operator": "gt", "value": 2.0}, {"field": "change_percent", "operator": "gt", "value": 3}]'::jsonb,
  'AND',
  '{stock,crypto}',
  true
),
(
  'Golden Cross (SMA 50 > SMA 200)',
  'Bullish signal where short-term trend crosses above long-term',
  '[{"field": "sma_cross_50_200", "operator": "gt", "value": 0}]'::jsonb,
  'AND',
  '{stock,crypto}',
  true
),
(
  'Bargain Hunter',
  'Oversold assets with high volume - potential reversal candidates',
  '[{"field": "rsi_14", "operator": "lt", "value": 35}, {"field": "volume_ratio", "operator": "gt", "value": 1.5}, {"field": "change_percent", "operator": "lt", "value": -2}]'::jsonb,
  'AND',
  '{stock,crypto}',
  true
),
(
  'Momentum Play',
  'Strong upward momentum with RSI confirmation',
  '[{"field": "rsi_14", "operator": "between", "value": [50, 70]}, {"field": "change_percent", "operator": "gt", "value": 5}]'::jsonb,
  'AND',
  '{stock,crypto}',
  true
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_screener_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER screener_profiles_updated_at
  BEFORE UPDATE ON screener_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_screener_profiles_updated_at();

-- Add comments
COMMENT ON TABLE screener_profiles IS 'User-defined and preset screener profiles for filtering securities';
COMMENT ON COLUMN screener_profiles.rules IS 'JSON array of screening rules: [{field, operator, value}]';
COMMENT ON COLUMN screener_profiles.logic IS 'How to combine rules: AND (all must match) or OR (any must match)';
COMMENT ON COLUMN screener_profiles.asset_types IS 'Array of asset types this screener applies to: stock, crypto';
COMMENT ON COLUMN screener_profiles.is_preset IS 'True for system-provided presets, false for user-created';
