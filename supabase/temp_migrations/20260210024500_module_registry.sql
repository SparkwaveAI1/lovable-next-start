-- Module Registry System
-- Master registry of all available modules with metadata
-- Works alongside tenant_config.enabled_modules for per-tenant activation

-- Module definitions (the master catalog of available modules)
CREATE TABLE IF NOT EXISTS module_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,              -- "crm", "email_marketing", "investments"
  name text NOT NULL,                     -- "CRM", "Email Marketing", "Investments"
  description text,                       -- Human-readable description
  category text NOT NULL DEFAULT 'core',  -- "core", "marketing", "operations", "analytics", "advanced"
  icon text DEFAULT 'Box',                -- Lucide icon name
  color text DEFAULT 'indigo',            -- Theme color for UI
  sort_order integer DEFAULT 0,           -- Display order in admin
  
  -- Feature metadata
  is_premium boolean DEFAULT false,       -- Requires paid plan
  is_beta boolean DEFAULT false,          -- Beta feature
  is_deprecated boolean DEFAULT false,    -- Being phased out
  
  -- Dependencies (array of module slugs that must be enabled)
  dependencies text[] DEFAULT '{}',
  
  -- Default configuration schema (JSONB)
  default_config jsonb DEFAULT '{}'::jsonb,
  
  -- Documentation
  docs_url text,
  help_text text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the module definitions with all current modules
INSERT INTO module_definitions (slug, name, description, category, icon, color, sort_order, is_premium, default_config) VALUES
  ('crm', 'CRM', 'Customer relationship management with contacts, leads, and pipeline', 'core', 'Users', 'blue', 1, false, '{"auto_lead_scoring": true}'),
  ('email_marketing', 'Email Marketing', 'Email campaigns, sequences, and automation', 'marketing', 'Mail', 'green', 10, false, '{"daily_limit": 500}'),
  ('sms', 'SMS', 'Text message campaigns and notifications', 'marketing', 'MessageSquare', 'purple', 11, false, '{"rate_limit_per_minute": 60}'),
  ('ai_assistant', 'AI Assistant', 'AI-powered responses and automation', 'core', 'Bot', 'violet', 2, false, '{"model": "gpt-4o-mini"}'),
  ('investment', 'Investments', 'Stock tracking, alerts, and portfolio management', 'advanced', 'TrendingUp', 'emerald', 30, true, '{"refresh_interval": 60}'),
  ('social_media', 'Social Media', 'Social media scheduling and analytics', 'marketing', 'Share2', 'pink', 12, false, '{}'),
  ('analytics', 'Analytics', 'Business intelligence and reporting', 'analytics', 'BarChart3', 'amber', 20, false, '{}'),
  ('automation', 'Automation', 'Workflow automation and triggers', 'core', 'Zap', 'orange', 3, false, '{}'),
  ('booking', 'Bookings', 'Appointment scheduling and calendar management', 'operations', 'Calendar', 'cyan', 15, false, '{}'),
  ('mission_control', 'Mission Control', 'Agent monitoring and system overview', 'advanced', 'Rocket', 'red', 31, true, '{}'),
  ('communications', 'Communications', 'Unified messaging hub for all channels', 'operations', 'MessageCircle', 'teal', 16, false, '{}'),
  ('content_center', 'Content Center', 'Content management and scheduling', 'marketing', 'FileText', 'slate', 13, false, '{}'),
  ('media_library', 'Media Library', 'Asset management for images and documents', 'operations', 'Image', 'gray', 17, false, '{}'),
  ('agents', 'AI Agents', 'Advanced AI agent configuration and registry', 'advanced', 'Cpu', 'fuchsia', 32, true, '{}'),
  ('reports', 'Reports', 'Scheduled and on-demand business reports', 'analytics', 'ClipboardList', 'lime', 21, false, '{}')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  updated_at = now();

-- Per-tenant module configuration (extends beyond on/off)
CREATE TABLE IF NOT EXISTS tenant_module_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  module_slug text NOT NULL REFERENCES module_definitions(slug) ON DELETE CASCADE,
  
  -- Enabled status (mirrors tenant_config.enabled_modules but with more detail)
  enabled boolean DEFAULT true,
  enabled_at timestamptz,
  disabled_at timestamptz,
  
  -- Module-specific configuration (overrides default_config from module_definitions)
  config jsonb DEFAULT '{}'::jsonb,
  
  -- Usage tracking
  last_used_at timestamptz,
  usage_count integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one config per module per tenant
  CONSTRAINT tenant_module_config_unique UNIQUE (business_id, module_slug)
);

-- Function to check if a module is enabled for a tenant
CREATE OR REPLACE FUNCTION is_module_enabled(
  p_business_id uuid,
  p_module_slug text
) RETURNS boolean AS $$
DECLARE
  v_enabled boolean;
  v_module_exists boolean;
BEGIN
  -- Check if module exists
  SELECT EXISTS(SELECT 1 FROM module_definitions WHERE slug = p_module_slug) INTO v_module_exists;
  IF NOT v_module_exists THEN
    RETURN false;
  END IF;

  -- Check tenant_module_config first
  SELECT enabled INTO v_enabled
  FROM tenant_module_config
  WHERE business_id = p_business_id AND module_slug = p_module_slug;
  
  IF v_enabled IS NOT NULL THEN
    RETURN v_enabled;
  END IF;
  
  -- Fall back to tenant_config.enabled_modules JSONB
  SELECT COALESCE(
    (enabled_modules->>p_module_slug)::boolean,
    CASE 
      WHEN p_module_slug IN ('investment', 'mission_control', 'agents') THEN false
      ELSE true
    END
  ) INTO v_enabled
  FROM tenant_config
  WHERE business_id = p_business_id;
  
  RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enable/disable a module for a tenant
CREATE OR REPLACE FUNCTION set_module_enabled(
  p_business_id uuid,
  p_module_slug text,
  p_enabled boolean
) RETURNS boolean AS $$
DECLARE
  v_module_exists boolean;
BEGIN
  -- Verify module exists
  SELECT EXISTS(SELECT 1 FROM module_definitions WHERE slug = p_module_slug) INTO v_module_exists;
  IF NOT v_module_exists THEN
    RAISE EXCEPTION 'Module % does not exist', p_module_slug;
  END IF;

  -- Upsert tenant_module_config
  INSERT INTO tenant_module_config (business_id, module_slug, enabled, enabled_at, disabled_at)
  VALUES (
    p_business_id, 
    p_module_slug, 
    p_enabled,
    CASE WHEN p_enabled THEN now() ELSE NULL END,
    CASE WHEN NOT p_enabled THEN now() ELSE NULL END
  )
  ON CONFLICT (business_id, module_slug) DO UPDATE SET
    enabled = p_enabled,
    enabled_at = CASE WHEN p_enabled AND NOT tenant_module_config.enabled THEN now() ELSE tenant_module_config.enabled_at END,
    disabled_at = CASE WHEN NOT p_enabled AND tenant_module_config.enabled THEN now() ELSE tenant_module_config.disabled_at END,
    updated_at = now();
  
  -- Also sync to tenant_config.enabled_modules for backward compatibility
  UPDATE tenant_config
  SET 
    enabled_modules = jsonb_set(
      COALESCE(enabled_modules, '{}'::jsonb),
      ARRAY[p_module_slug],
      to_jsonb(p_enabled)
    ),
    updated_at = now()
  WHERE business_id = p_business_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all modules with their status for a tenant
CREATE OR REPLACE FUNCTION get_tenant_modules(p_business_id uuid)
RETURNS TABLE (
  slug text,
  name text,
  description text,
  category text,
  icon text,
  color text,
  is_premium boolean,
  is_beta boolean,
  is_enabled boolean,
  config jsonb,
  last_used_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    md.slug,
    md.name,
    md.description,
    md.category,
    md.icon,
    md.color,
    md.is_premium,
    md.is_beta,
    COALESCE(tmc.enabled, is_module_enabled(p_business_id, md.slug)) as is_enabled,
    COALESCE(tmc.config, md.default_config) as config,
    tmc.last_used_at
  FROM module_definitions md
  LEFT JOIN tenant_module_config tmc ON tmc.module_slug = md.slug AND tmc.business_id = p_business_id
  WHERE NOT md.is_deprecated
  ORDER BY md.sort_order, md.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_definitions_category ON module_definitions(category);
CREATE INDEX IF NOT EXISTS idx_module_definitions_slug ON module_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_module_config_business ON tenant_module_config(business_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_config_module ON tenant_module_config(module_slug);

-- RLS
ALTER TABLE module_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_module_config ENABLE ROW LEVEL SECURITY;

-- Module definitions are readable by all authenticated users
CREATE POLICY "Module definitions readable by authenticated" ON module_definitions
  FOR SELECT TO authenticated USING (true);

-- Only service role can modify module definitions
CREATE POLICY "Module definitions modifiable by service role" ON module_definitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tenant module config follows standard tenant access pattern
CREATE POLICY "Tenant module config readable by authenticated" ON tenant_module_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tenant module config modifiable by authenticated" ON tenant_module_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Tenant module config full access for service role" ON tenant_module_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Update triggers
CREATE TRIGGER module_definitions_updated_at
  BEFORE UPDATE ON module_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tenant_module_config_updated_at
  BEFORE UPDATE ON tenant_module_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant function access
GRANT EXECUTE ON FUNCTION is_module_enabled TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION set_module_enabled TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_tenant_modules TO authenticated, service_role;

-- Comments
COMMENT ON TABLE module_definitions IS 'Master catalog of all available modules/features in the system';
COMMENT ON TABLE tenant_module_config IS 'Per-tenant module enablement and configuration';
COMMENT ON FUNCTION is_module_enabled IS 'Check if a specific module is enabled for a tenant';
COMMENT ON FUNCTION set_module_enabled IS 'Enable or disable a module for a tenant';
COMMENT ON FUNCTION get_tenant_modules IS 'Get all modules with their status for a tenant';
