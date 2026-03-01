-- System Operations Dashboard Tables
-- Create tables manually since migration has conflicts

-- Table to store all system components (pipelines, crons, scripts, edge functions)
CREATE TABLE IF NOT EXISTS system_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'fightflow', 'twitter', 'health', 'mission_control', 'edge_function', 'config'
    type TEXT NOT NULL, -- 'cron', 'script', 'edge_function', 'config_file', 'pipeline'
    description TEXT NOT NULL,
    script_path TEXT, -- path to script file (null for edge functions)
    schedule TEXT, -- cron schedule (null for manual/edge functions)
    pipeline TEXT, -- which pipeline this belongs to
    trigger_type TEXT, -- 'openclaw_cron', 'system_cron', 'webhook', 'manual', 'edge_function'
    dependencies TEXT[], -- array of dependencies
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table to store status snapshots collected 2x daily
CREATE TABLE IF NOT EXISTS system_status_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registry_id UUID REFERENCES system_registry(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'success', 'failed', 'stale', 'unknown'
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    error_message TEXT,
    runtime_seconds INTEGER,
    metadata JSONB, -- additional status data
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_registry_category ON system_registry(category);
CREATE INDEX IF NOT EXISTS idx_system_registry_type ON system_registry(type);
CREATE INDEX IF NOT EXISTS idx_system_registry_pipeline ON system_registry(pipeline);
CREATE INDEX IF NOT EXISTS idx_system_status_log_registry_id ON system_status_log(registry_id);
CREATE INDEX IF NOT EXISTS idx_system_status_log_created_at ON system_status_log(created_at);
CREATE INDEX IF NOT EXISTS idx_system_status_log_status ON system_status_log(status);

-- RLS policies
ALTER TABLE system_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_status_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read system_registry" ON system_registry;
DROP POLICY IF EXISTS "Anyone can read system_status_log" ON system_status_log;
DROP POLICY IF EXISTS "Service role can write system_registry" ON system_registry;
DROP POLICY IF EXISTS "Service role can write system_status_log" ON system_status_log;

-- Allow authenticated users to read system registry and status
CREATE POLICY "Anyone can read system_registry" ON system_registry FOR SELECT USING (true);
CREATE POLICY "Anyone can read system_status_log" ON system_status_log FOR SELECT USING (true);

-- Only service role can write (edge functions)
CREATE POLICY "Service role can write system_registry" ON system_registry FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can write system_status_log" ON system_status_log FOR ALL USING (auth.role() = 'service_role');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_system_registry_updated_at ON system_registry;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_system_registry_updated_at BEFORE UPDATE ON system_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for latest status per registry item
DROP VIEW IF EXISTS system_latest_status;
CREATE VIEW system_latest_status AS
SELECT DISTINCT ON (ssl.registry_id)
    sr.id as registry_id,
    sr.name,
    sr.category,
    sr.type,
    sr.pipeline,
    sr.schedule,
    ssl.status,
    ssl.last_run,
    ssl.next_run,
    ssl.error_message,
    ssl.runtime_seconds,
    ssl.created_at as status_checked_at
FROM system_registry sr
LEFT JOIN system_status_log ssl ON sr.id = ssl.registry_id
ORDER BY ssl.registry_id, ssl.created_at DESC;

COMMENT ON TABLE system_registry IS 'Registry of all system components: pipelines, crons, scripts, edge functions';
COMMENT ON TABLE system_status_log IS 'Status snapshots collected 2x daily by system-ops-status edge function';
COMMENT ON VIEW system_latest_status IS 'Latest status for each registered system component';