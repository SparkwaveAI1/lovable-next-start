-- Migration: create agent_logs table
-- Used by: src/pages/Reports.tsx (Agent Activity Log section)
--          src/pages/MissionControl.tsx (derive live agent status)
-- SPA-2777 fix: table was missing; queries wrapped in (supabase as any) to silence TS errors

CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent TEXT,                 -- 'Rico' | 'Iris' | 'Dev' | 'Jerry' | 'Opal' | 'Arlo'
    event_type TEXT,            -- e.g. 'task_started', 'task_done', 'heartbeat', 'error'
    label TEXT,                 -- human-readable description of the event
    status TEXT,                -- 'pass' | 'fail' | 'warn' (optional)
    details TEXT,               -- additional context / JSON payload as text
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the most common query patterns
CREATE INDEX idx_agent_logs_created_at ON agent_logs (created_at DESC);
CREATE INDEX idx_agent_logs_agent ON agent_logs (agent);
CREATE INDEX idx_agent_logs_event_type ON agent_logs (event_type);

-- RLS
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agent_logs"
    ON agent_logs FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can write agent_logs"
    ON agent_logs FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE agent_logs IS 'Structured event log written by all agents. Used by MissionControl to derive live agent status and by Reports to show recent activity feed.';
