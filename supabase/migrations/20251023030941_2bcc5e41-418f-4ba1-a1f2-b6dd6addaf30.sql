-- Token health monitoring table
CREATE TABLE IF NOT EXISTS token_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER,
  error_message TEXT,
  test_post_attempted BOOLEAN DEFAULT false,
  test_post_successful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_token_health_business ON token_health_checks(business_id);
CREATE INDEX idx_token_health_status ON token_health_checks(status);
CREATE INDEX idx_token_health_timestamp ON token_health_checks(check_timestamp DESC);

-- View for latest health status per business/platform
CREATE OR REPLACE VIEW latest_token_health AS
SELECT DISTINCT ON (business_id, platform)
  id,
  business_id,
  platform,
  check_timestamp,
  status,
  token_expires_at,
  days_until_expiry,
  error_message,
  test_post_attempted,
  test_post_successful
FROM token_health_checks
ORDER BY business_id, platform, check_timestamp DESC;

-- Alert preferences table
CREATE TABLE IF NOT EXISTS token_alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_days_before_expiry INTEGER DEFAULT 7,
  check_frequency_hours INTEGER DEFAULT 24,
  alert_email TEXT,
  alert_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default alert preferences
INSERT INTO token_alert_preferences (warning_days_before_expiry, check_frequency_hours, alert_enabled)
VALUES (7, 24, true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE token_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_alert_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Token health checks are publicly readable" ON token_health_checks
  FOR SELECT USING (true);

CREATE POLICY "Token health checks are publicly writable" ON token_health_checks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Alert preferences are publicly readable" ON token_alert_preferences
  FOR SELECT USING (true);

CREATE POLICY "Alert preferences are publicly writable" ON token_alert_preferences
  FOR ALL USING (true);