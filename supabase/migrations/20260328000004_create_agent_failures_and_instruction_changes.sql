-- Migration: create agent_failures + instruction_changes tables
-- Used by: src/components/dashboard/KarpathyAuditPanel.tsx
-- SPA-2777 fix: both tables missing; Karpathy audit panel showed no data

-- agent_failures: log of detected agent behavioral failures
CREATE TABLE IF NOT EXISTS agent_failures (
    failure_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name TEXT NOT NULL,
    category TEXT,                  -- e.g. 'completion_verification', 'status_reporting', 'scope_narrowing'
    description TEXT NOT NULL,
    session_reference TEXT,         -- session key or Paperclip issue id
    severity TEXT NOT NULL DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'critical'
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_failures_agent_name ON agent_failures (agent_name);
CREATE INDEX idx_agent_failures_created_at ON agent_failures (created_at DESC);
CREATE INDEX idx_agent_failures_category ON agent_failures (category);

ALTER TABLE agent_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read agent_failures"
    ON agent_failures FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can write agent_failures"
    ON agent_failures FOR ALL
    USING (auth.role() = 'service_role');

-- instruction_changes: proposed and applied BOOTSTRAP/agent behavior rule changes
CREATE TABLE IF NOT EXISTS instruction_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name TEXT NOT NULL,
    short_label TEXT NOT NULL,          -- brief human-readable title
    description TEXT,                   -- full proposed rule text
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'applied' | 'rejected' | 'holding'
    verification_status TEXT,           -- 'verified' | 'recurred' | 'pending' | null
    tier INTEGER,                       -- approval tier (1-4)
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    source_failure_uuids UUID[],        -- array of agent_failures.failure_id that prompted this change
    reviewer_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instruction_changes_agent_name ON instruction_changes (agent_name);
CREATE INDEX idx_instruction_changes_status ON instruction_changes (status);
CREATE INDEX idx_instruction_changes_proposed_at ON instruction_changes (proposed_at DESC);

ALTER TABLE instruction_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read instruction_changes"
    ON instruction_changes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can write instruction_changes"
    ON instruction_changes FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE agent_failures IS 'Log of detected agent behavioral failures feeding the Karpathy self-improvement loop.';
COMMENT ON TABLE instruction_changes IS 'Proposed and applied BOOTSTRAP/agent rule changes via Karpathy self-improvement loop.';
