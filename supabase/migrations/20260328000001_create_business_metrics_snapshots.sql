-- Migration: create business_metrics_snapshots table
-- Used by: src/pages/BusinessMetrics.tsx
-- SPA-2777 fix: table was missing, causing BusinessMetrics page to 404 on query

CREATE TABLE IF NOT EXISTS business_metrics_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metric_category TEXT NOT NULL,  -- 'linkedin' | 'email' | 'revenue' | 'agent_performance' | 'fight_flow' | 'outreach' | 'twitter' | 'content'
    metric_key TEXT NOT NULL,
    metric_value NUMERIC,
    metric_label TEXT,
    status TEXT,                     -- 'ok' | 'warn' | 'error' | 'unknown'
    source_agent TEXT,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the most common query pattern (last 24h, dedup by category+key)
CREATE INDEX idx_bms_snapshot_at ON business_metrics_snapshots (snapshot_at DESC);
CREATE INDEX idx_bms_category_key ON business_metrics_snapshots (metric_category, metric_key);
CREATE INDEX idx_bms_business_id ON business_metrics_snapshots (business_id);

-- RLS
ALTER TABLE business_metrics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read business_metrics_snapshots"
    ON business_metrics_snapshots FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can write business_metrics_snapshots"
    ON business_metrics_snapshots FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE business_metrics_snapshots IS 'Point-in-time metric snapshots written by monitoring agents (Rico, Jerry, Iris). Deduplicated by category+key in the UI to show latest per metric.';
