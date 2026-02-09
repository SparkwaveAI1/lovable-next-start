-- Tenant Configuration System
-- Per-tenant settings for branding, modules, notifications, and timezone

CREATE TABLE IF NOT EXISTS tenant_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Branding settings
  branding jsonb DEFAULT '{
    "primary_color": "#6366f1",
    "secondary_color": "#8b5cf6",
    "logo_url": null,
    "favicon_url": null,
    "company_name": null,
    "tagline": null
  }'::jsonb,
  
  -- Enabled modules (feature flags per tenant)
  enabled_modules jsonb DEFAULT '{
    "crm": true,
    "email_marketing": true,
    "sms": true,
    "ai_assistant": true,
    "investment": false,
    "social_media": true,
    "analytics": true,
    "automation": true,
    "booking": true,
    "mission_control": false
  }'::jsonb,
  
  -- Notification preferences
  notifications jsonb DEFAULT '{
    "email_enabled": true,
    "sms_enabled": false,
    "push_enabled": false,
    "digest_frequency": "daily",
    "alert_threshold": "high",
    "quiet_hours_start": null,
    "quiet_hours_end": null
  }'::jsonb,
  
  -- Timezone setting
  timezone text DEFAULT 'America/New_York',
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one config per business
  CONSTRAINT tenant_config_business_unique UNIQUE (business_id)
);

-- Index for fast lookup by business
CREATE INDEX idx_tenant_config_business_id ON tenant_config(business_id);

-- Trigger to update updated_at
CREATE TRIGGER update_tenant_config_updated_at
  BEFORE UPDATE ON tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant config readable by authenticated users"
  ON tenant_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tenant config updatable by authenticated users"
  ON tenant_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tenant config insertable by authenticated users"
  ON tenant_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Initialize config for existing businesses
INSERT INTO tenant_config (business_id)
SELECT id FROM businesses
ON CONFLICT (business_id) DO NOTHING;

-- Comments
COMMENT ON TABLE tenant_config IS 'Per-tenant configuration settings for branding, modules, notifications, and timezone';
COMMENT ON COLUMN tenant_config.branding IS 'Branding customization: colors, logo, company name, tagline';
COMMENT ON COLUMN tenant_config.enabled_modules IS 'Feature flags controlling which modules are available to this tenant';
COMMENT ON COLUMN tenant_config.notifications IS 'Notification preferences: channels, frequency, quiet hours';
COMMENT ON COLUMN tenant_config.timezone IS 'Tenant timezone for scheduling and display (IANA format)';
