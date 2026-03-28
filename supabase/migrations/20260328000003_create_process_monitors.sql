-- Migration: create process_monitors table
-- Used by: src/pages/SystemMonitoring.tsx
-- SPA-2777 fix: table was missing; SystemMonitoring page silently returned empty agent/cron data

CREATE TABLE IF NOT EXISTS process_monitors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    process_name TEXT NOT NULL UNIQUE,        -- unique key for the process (e.g. 'twitter-rico-cron-1')
    display_name TEXT NOT NULL,               -- human-readable name shown in UI
    category TEXT,                            -- 'fightflow' | 'twitter' | 'health' | 'mission_control' | 'system'
    owner_agent TEXT,                         -- 'rico' | 'jerry' | 'iris' | 'dev' | 'opal'
    server_name TEXT,                         -- 'rico' | 'jerry' | 'iris' | 'dev' | 'opal'
    schedule_description TEXT,                -- human-readable schedule (e.g. 'every 15 min')
    last_status TEXT,                         -- 'success' | 'error' | 'warning' | 'unknown'
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    consecutive_errors INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_process_monitors_is_active ON process_monitors (is_active);
CREATE INDEX idx_process_monitors_category ON process_monitors (category);
CREATE INDEX idx_process_monitors_server_name ON process_monitors (server_name);
CREATE INDEX idx_process_monitors_owner_agent ON process_monitors (owner_agent);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_process_monitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_monitors_updated_at
    BEFORE UPDATE ON process_monitors
    FOR EACH ROW EXECUTE FUNCTION update_process_monitors_updated_at();

-- RLS
ALTER TABLE process_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read process_monitors"
    ON process_monitors FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can write process_monitors"
    ON process_monitors FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE process_monitors IS 'Health registry for all agent processes and cron jobs. Written by agents via service role; read by SystemMonitoring dashboard to derive agent online status and cron health.';
