-- Migration: create remaining missing tables identified in SPA-2777 full audit
-- Tables: fightflow_appointments, automations, user_profiles, mc_alerts,
--         prospect_pipeline, module_definitions, tenant_module_config,
--         content_analytics, content_analytics_daily

-- ─────────────────────────────────────────────────────────────────────────────
-- fightflow_appointments
-- Used by: FightFlowDashboard.tsx (today's appointments view)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fightflow_appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ,
    service_name TEXT,
    status TEXT DEFAULT 'scheduled',  -- 'scheduled' | 'completed' | 'cancelled' | 'no_show'
    instructor TEXT,
    location TEXT,
    wix_booking_id TEXT UNIQUE,       -- external sync key from Wix Bookings API
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fightflow_appts_session_start ON fightflow_appointments (session_start);
CREATE INDEX idx_fightflow_appts_status ON fightflow_appointments (status);
CREATE INDEX idx_fightflow_appts_wix_id ON fightflow_appointments (wix_booking_id);

ALTER TABLE fightflow_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read fightflow_appointments" ON fightflow_appointments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can write fightflow_appointments" ON fightflow_appointments FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE fightflow_appointments IS 'Fight Flow Academy appointment/booking records synced from Wix Bookings API. Used by FightFlowDashboard for today''s class view.';

-- ─────────────────────────────────────────────────────────────────────────────
-- automations
-- Used by: OnboardingWizard.tsx (creates initial automation on sign-up)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'lead_processing' | 'social_media' | 'email_marketing' | etc.
    trigger_type TEXT,            -- 'scheduled' | 'webhook' | 'event' | 'manual'
    is_active BOOLEAN NOT NULL DEFAULT true,
    config JSONB DEFAULT '{}',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automations_user_id ON automations (user_id);
CREATE INDEX idx_automations_business_id ON automations (business_id);
CREATE INDEX idx_automations_is_active ON automations (is_active);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read automations" ON automations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can write automations" ON automations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Service role can write automations" ON automations FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE automations IS 'User-configured automation definitions. Created during onboarding; executed by cron workers.';

-- ─────────────────────────────────────────────────────────────────────────────
-- user_profiles
-- Used by: OnboardingWizard.tsx (upserts user profile on onboarding complete)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    business_type TEXT,
    team_size TEXT,
    primary_goals TEXT[],
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on user_profiles" ON user_profiles FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE user_profiles IS 'User onboarding profile data (business type, team size, goals). Collected during signup wizard.';

-- ─────────────────────────────────────────────────────────────────────────────
-- mc_alerts
-- Used by: SystemMonitoringPanel.tsx (fallback health check proxy)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mc_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL,       -- 'error' | 'warning' | 'info'
    source TEXT,                    -- agent or system that raised the alert
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mc_alerts_created_at ON mc_alerts (created_at DESC);
CREATE INDEX idx_mc_alerts_resolved ON mc_alerts (resolved);
CREATE INDEX idx_mc_alerts_source ON mc_alerts (source);

ALTER TABLE mc_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read mc_alerts" ON mc_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can write mc_alerts" ON mc_alerts FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE mc_alerts IS 'Mission Control system alerts raised by agents and monitoring scripts. Used as health-check proxy in SystemMonitoringPanel.';

-- ─────────────────────────────────────────────────────────────────────────────
-- prospect_pipeline
-- Used by: SalesVisibilityPanel.tsx (call_booked_at metrics)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospect_pipeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES sales_prospects(id) ON DELETE SET NULL,
    stage TEXT NOT NULL DEFAULT 'lead',  -- 'lead' | 'contacted' | 'demo' | 'proposal' | 'closed_won' | 'closed_lost'
    call_booked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    demo_at TIMESTAMPTZ,
    deal_value NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_pipeline_business_id ON prospect_pipeline (business_id);
CREATE INDEX idx_prospect_pipeline_stage ON prospect_pipeline (stage);
CREATE INDEX idx_prospect_pipeline_call_booked ON prospect_pipeline (call_booked_at);

ALTER TABLE prospect_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read prospect_pipeline" ON prospect_pipeline FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can write prospect_pipeline" ON prospect_pipeline FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE prospect_pipeline IS 'Sales pipeline stage tracking with call/reply timestamps. Used by SalesVisibilityPanel for conversion metrics.';

-- ─────────────────────────────────────────────────────────────────────────────
-- module_definitions
-- Used by: useModules.ts (master catalog of available platform modules)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'core',  -- 'core' | 'marketing' | 'operations' | 'analytics' | 'advanced'
    icon TEXT NOT NULL DEFAULT 'box',
    color TEXT NOT NULL DEFAULT '#6366f1',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    is_beta BOOLEAN NOT NULL DEFAULT false,
    is_deprecated BOOLEAN NOT NULL DEFAULT false,
    dependencies TEXT[] DEFAULT '{}',
    default_config JSONB DEFAULT '{}',
    docs_url TEXT,
    help_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_module_definitions_slug ON module_definitions (slug);
CREATE INDEX idx_module_definitions_category ON module_definitions (category);
CREATE INDEX idx_module_definitions_sort_order ON module_definitions (sort_order);

ALTER TABLE module_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read module_definitions" ON module_definitions FOR SELECT USING (true);
CREATE POLICY "Service role can write module_definitions" ON module_definitions FOR ALL USING (auth.role() = 'service_role');

-- Seed with core modules
INSERT INTO module_definitions (slug, name, description, category, icon, color, sort_order, is_premium, is_beta)
VALUES
  ('crm',            'CRM',              'Prospect and customer management',         'core',      'users',         '#6366f1', 10, false, false),
  ('email_marketing','Email Marketing',  'Campaign and drip email automation',       'marketing', 'mail',          '#f59e0b', 20, false, false),
  ('sms',            'SMS',              'SMS messaging and automation',             'marketing', 'message-square','#10b981', 30, false, false),
  ('ai_assistant',   'AI Assistant',     'AI-powered customer assistant',            'advanced',  'bot',           '#8b5cf6', 40, true,  false),
  ('social_media',   'Social Media',     'Twitter, LinkedIn, TikTok scheduling',     'marketing', 'share-2',       '#3b82f6', 50, false, false),
  ('analytics',      'Analytics',        'Content and campaign analytics',           'analytics', 'bar-chart-2',   '#06b6d4', 60, false, false),
  ('automation',     'Automation',       'Workflow automation and triggers',         'operations','zap',           '#f97316', 70, false, false),
  ('booking',        'Booking',          'Appointment and class booking',            'operations','calendar',      '#ec4899', 80, false, false),
  ('mission_control','Mission Control',  'Agent coordination dashboard',             'advanced',  'monitor',       '#6366f1', 90, true,  true),
  ('communications', 'Communications',   'Unified inbox — SMS, email, web',          'core',      'inbox',         '#14b8a6', 100, false, false),
  ('content_center', 'Content Center',   'Content pipeline and publishing',          'marketing', 'file-text',     '#f59e0b', 110, false, false),
  ('media_library',  'Media Library',    'File and media asset management',          'operations','image',         '#a855f7', 120, false, false),
  ('agents',         'Agents',           'AI agent management and monitoring',       'advanced',  'cpu',           '#3b82f6', 130, true,  true),
  ('reports',        'Reports',          'Agent logs and activity reports',          'analytics', 'clipboard-list','#64748b', 140, false, false)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE module_definitions IS 'Master catalog of available platform modules. Read by useModules hook; seeded during initial setup.';

-- ─────────────────────────────────────────────────────────────────────────────
-- tenant_module_config
-- Used by: useModules.ts (per-tenant module enabled/disabled state)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_module_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    module_slug TEXT NOT NULL REFERENCES module_definitions(slug) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    enabled_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (business_id, module_slug)
);

CREATE INDEX idx_tenant_module_config_business_id ON tenant_module_config (business_id);
CREATE INDEX idx_tenant_module_config_slug ON tenant_module_config (module_slug);
CREATE INDEX idx_tenant_module_config_enabled ON tenant_module_config (enabled);

ALTER TABLE tenant_module_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read own tenant_module_config" ON tenant_module_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can write tenant_module_config" ON tenant_module_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update tenant_module_config" ON tenant_module_config FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access tenant_module_config" ON tenant_module_config FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE tenant_module_config IS 'Per-tenant (business) module enablement and configuration. Controls which features are active for each business.';

-- ─────────────────────────────────────────────────────────────────────────────
-- content_analytics
-- Used by: analyticsService.ts (trackEvent — raw event log)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    content_id TEXT,
    content_type TEXT,              -- 'post' | 'blog' | 'video' | 'image' | 'email'
    event_type TEXT NOT NULL,       -- 'view' | 'play' | 'share' | 'download' | 'click'
    platform TEXT DEFAULT 'web',
    user_id UUID,
    session_id TEXT,
    metadata JSONB DEFAULT '{}',
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_analytics_business_id ON content_analytics (business_id);
CREATE INDEX idx_content_analytics_content_id ON content_analytics (content_id);
CREATE INDEX idx_content_analytics_event_type ON content_analytics (event_type);
CREATE INDEX idx_content_analytics_created_at ON content_analytics (created_at DESC);

ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read content_analytics" ON content_analytics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert content_analytics" ON content_analytics FOR INSERT WITH CHECK (true);  -- anon tracking allowed
CREATE POLICY "Service role can write content_analytics" ON content_analytics FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE content_analytics IS 'Raw content analytics event log. Written by analyticsService.trackEvent; aggregated nightly into content_analytics_daily.';

-- ─────────────────────────────────────────────────────────────────────────────
-- content_analytics_daily
-- Used by: analyticsService.ts (getAnalyticsSummary, getContentAnalytics)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_analytics_daily (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    content_id TEXT,
    content_type TEXT,
    platform TEXT,
    date DATE NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    plays INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (business_id, content_id, date, platform)
);

CREATE INDEX idx_content_analytics_daily_business_id ON content_analytics_daily (business_id);
CREATE INDEX idx_content_analytics_daily_content_id ON content_analytics_daily (content_id);
CREATE INDEX idx_content_analytics_daily_date ON content_analytics_daily (date DESC);

ALTER TABLE content_analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read content_analytics_daily" ON content_analytics_daily FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can write content_analytics_daily" ON content_analytics_daily FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE content_analytics_daily IS 'Daily-aggregated content analytics. Populated by nightly cron from content_analytics raw events. Used by analyticsService for dashboard summaries.';
