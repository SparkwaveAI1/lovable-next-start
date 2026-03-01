-- System Operations Dashboard Tables
-- Task ID: 5e38d048-98da-4e1f-9110-66956b3e9797

-- Table to store all system components (pipelines, crons, scripts, edge functions)
CREATE TABLE system_registry (
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
CREATE TABLE system_status_log (
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
CREATE INDEX idx_system_registry_category ON system_registry(category);
CREATE INDEX idx_system_registry_type ON system_registry(type);
CREATE INDEX idx_system_registry_pipeline ON system_registry(pipeline);
CREATE INDEX idx_system_status_log_registry_id ON system_status_log(registry_id);
CREATE INDEX idx_system_status_log_created_at ON system_status_log(created_at);
CREATE INDEX idx_system_status_log_status ON system_status_log(status);

-- RLS policies
ALTER TABLE system_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_status_log ENABLE ROW LEVEL SECURITY;

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

-- Trigger to auto-update updated_at
CREATE TRIGGER update_system_registry_updated_at BEFORE UPDATE ON system_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed system registry with key pipeline components
INSERT INTO system_registry (name, category, type, description, script_path, schedule, pipeline, trigger_type, dependencies) VALUES

-- Fight Flow Pipeline
('Form Capture', 'fightflow', 'cron', 'Polls Wix Forms API for new submissions; stores lead to Supabase; sends immediate SMS ack', '/root/clawd/scripts/fightflow-form-capture-v2.mjs', 'every 10 min', 'Fight Flow', 'openclaw_cron', ARRAY['Wix API', 'Supabase', 'send-sms edge function']),
('Immediate Response', 'fightflow', 'cron', 'Sends immediate AI-generated SMS to new leads with phone numbers', '/root/clawd/scripts/fightflow-immediate-response.mjs', 'every 15 min', 'Fight Flow', 'openclaw_cron', ARRAY['Supabase', 'Twilio', 'send-sms edge function']),
('Bookings Sync', 'fightflow', 'cron', 'Polls Wix Bookings API for new/updated bookings; upserts to fightflow_appointments', '/root/clawd/scripts/fightflow-bookings-sync.mjs', 'every 15 min', 'Fight Flow', 'system_cron', ARRAY['Wix Bookings API', 'Supabase']),
('Appointment Trigger', 'fightflow', 'cron', 'Creates sequence steps for new confirmed appointments with real class times', '/root/clawd/scripts/fightflow-appointment-trigger.mjs', 'every 15 min', 'Fight Flow', 'openclaw_cron', ARRAY['Supabase']),
('Sequence Manager', 'fightflow', 'cron', 'Processes pending sequence steps; sends timed trial reminder SMS', '/root/clawd/scripts/fightflow-sequence-manager-fixed.mjs', '0,30 13-23 * * *', 'Fight Flow', 'system_cron', ARRAY['Supabase', 'Twilio']),
('SMS Webhook', 'fightflow', 'edge_function', 'Receives inbound SMS; handles STOP keywords; routes responses; queues AI', 'supabase/functions/sms-webhook', NULL, 'Fight Flow', 'webhook', ARRAY['Twilio', 'Supabase']),
('AI Response', 'fightflow', 'edge_function', 'AI chatbot using Claude; handles inquiries and booking confirmations', 'supabase/functions/ai-response', NULL, 'Fight Flow', 'edge_function', ARRAY['OpenRouter', 'Supabase']),
('SMS Response Alert', 'fightflow', 'cron', 'Alerts Scott via Telegram for new inbound SMS messages', '/root/clawd/scripts/sms-response-alert.mjs', 'every 15 min', 'Fight Flow', 'system_cron', ARRAY['Supabase', 'Telegram']),
('Instructor Notify', 'fightflow', 'cron', 'Pre/post-class alerts to instructors about trial students', '/root/clawd/scripts/fightflow-instructor-notify.mjs', '11 AM + 9 PM UTC Mon-Fri', 'Fight Flow', 'openclaw_cron', ARRAY['Supabase', 'Twilio']),

-- Twitter Pipeline
('Daily Context Update', 'twitter', 'cron', 'Searches Twitter for active conversations per account; saves context', '/root/clawd/scripts/twitter/update-daily-context.mjs', '0 12 * * *', 'Twitter', 'system_cron', ARRAY['Twitter API']),
('Integrated Workflow PersonaAI', 'twitter', 'cron', 'Full posting session: tweet + comments + engagement for PersonaAI', '/root/clawd/scripts/twitter/integrated-workflow.mjs', '4x daily', 'Twitter', 'openclaw_cron', ARRAY['OpenRouter', 'Twitter API']),
('Integrated Workflow CharX', 'twitter', 'cron', 'Full posting session: tweet + comments + engagement for CharX', '/root/clawd/scripts/twitter/integrated-workflow.mjs', '4x daily', 'Twitter', 'openclaw_cron', ARRAY['OpenRouter', 'Twitter API']),
('Post Barnum', 'twitter', 'cron', 'Special Barnum pipeline: CharX API + quality gate + posting', '/root/clawd/scripts/twitter/post-barnum.mjs', '4x daily', 'Twitter', 'openclaw_cron', ARRAY['CharX API', 'Twitter API']),
('Scan and Reply', 'twitter', 'cron', 'Replies to comments on account posts (persona, charx, barnum)', '/root/clawd/scripts/twitter/scan-and-reply.mjs', 'hourly', 'Twitter', 'system_cron', ARRAY['Twitter API', 'OpenRouter']),
('Cross Engage', 'twitter', 'cron', 'Cross-account comments and external engagement monitoring', '/root/clawd/scripts/twitter/cross-engage.mjs', 'every 4 hours', 'Twitter', 'system_cron', ARRAY['Twitter API', 'OpenRouter']),
('Cross Account Like', 'twitter', 'cron', 'Likes each Sparkwave account tweets from the other 3 accounts', '/root/clawd/scripts/twitter/cross-account-like.mjs', 'every 15 min', 'Twitter', 'openclaw_cron', ARRAY['Twitter API', 'Supabase']),

-- Health Pipeline
('Morning Health Check', 'health', 'cron', 'Loads goals.json; runs checks vs thresholds; outputs status', '/root/clawd/scripts/health/check.mjs', '8 AM ET', 'Health', 'openclaw_cron', ARRAY['Supabase', 'goals.json']),
('Evening Health Check', 'health', 'cron', 'Evening system health check against thresholds', '/root/clawd/scripts/health/check.mjs', '11 PM ET', 'Health', 'openclaw_cron', ARRAY['Supabase', 'goals.json']),
('Twitter Metrics', 'health', 'cron', 'Captures daily Twitter metrics to daily_metrics table', '/root/clawd/scripts/metrics/twitter-daily.mjs', '11:00 PM ET', 'Health', 'openclaw_cron', ARRAY['Twitter API', 'Supabase']),
('Fight Flow Metrics', 'health', 'cron', 'Captures Fight Flow metrics (leads, SMS, bookings)', '/root/clawd/scripts/metrics/fightflow-daily.mjs', '11:02 PM ET', 'Health', 'openclaw_cron', ARRAY['Supabase']),
('Agent Behavior Metrics', 'health', 'cron', 'Captures agent behavior metrics (tasks, spawns, rate limits)', '/root/clawd/scripts/metrics/agent-behavior.mjs', '11:04 PM ET', 'Health', 'openclaw_cron', ARRAY['Supabase']),
('Nightly Report', 'health', 'cron', 'Generates markdown report from last 7 days metrics', '/root/clawd/scripts/metrics/nightly-report.mjs', '11:06 PM ET', 'Health', 'openclaw_cron', ARRAY['Supabase']),
('Evaluation Loop', 'health', 'cron', 'Comprehensive nightly self-improvement review', '/root/clawd/scripts/metrics/evaluation-loop.mjs', '11:08 PM ET', 'Health', 'openclaw_cron', ARRAY['Supabase', 'OpenRouter']),
('Verify Changes', 'health', 'cron', 'Checks change-log.md for pending entries; updates verdicts', '/root/clawd/scripts/metrics/verify-changes.mjs', '11:10 PM ET', 'Health', 'openclaw_cron', ARRAY['Supabase']),

-- Mission Control Infrastructure
('MC Task Management', 'mission_control', 'script', 'Task lifecycle: start, progress, done, verify, block, abandon', '/root/clawd/scripts/mc-task.mjs', NULL, NULL, 'manual', ARRAY['Supabase']),
('Activity Logging', 'mission_control', 'script', 'Logs activities to daily logs and mc_activities', '/root/clawd/scripts/log-activity.mjs', NULL, NULL, 'manual', ARRAY['Supabase']),
('Task Staleness Check', 'mission_control', 'cron', 'Finds Rico-Main in_progress tasks >4h old; alerts Scott', '/root/clawd/scripts/mc-task-staleness-check.mjs', '9 AM ET', NULL, 'openclaw_cron', ARRAY['Supabase', 'Telegram']),
('Working Sync', 'mission_control', 'cron', 'Syncs in_progress tasks with WORKING.md', '/root/clawd/scripts/mc-working-sync.mjs', 'every 30 min', NULL, 'openclaw_cron', ARRAY['Supabase']),
('Session Audit', 'mission_control', 'cron', 'Daily session activity audit for quality/compliance', '/root/clawd/scripts/audit/session-audit.mjs', 'midnight UTC', NULL, 'openclaw_cron', ARRAY['session logs']),
('Token Usage Monitor', 'mission_control', 'cron', 'Monitors Claude token usage; alerts at thresholds', NULL, '9AM/3PM/9PM ET', NULL, 'openclaw_cron', ARRAY['OpenClaw session_status', 'Telegram']),

-- Key Edge Functions
('Send SMS', 'fightflow', 'edge_function', 'SMS via Twilio with E.164 normalization and validation', 'supabase/functions/send-sms', NULL, 'Fight Flow', 'edge_function', ARRAY['Twilio', 'Supabase']),
('Send Email', 'mission_control', 'edge_function', 'Email via Resend with template support and retry logic', 'supabase/functions/send-email', NULL, NULL, 'edge_function', ARRAY['Resend', 'Supabase']),
('Mission Control Activities', 'mission_control', 'edge_function', 'CRUD for mc_activities (activity feed)', 'supabase/functions/mission-control-activities', NULL, NULL, 'edge_function', ARRAY['Supabase']),
('Mission Control Tasks', 'mission_control', 'edge_function', 'CRUD for mc_tasks table', 'supabase/functions/mission-control-tasks', NULL, NULL, 'edge_function', ARRAY['Supabase']);

-- Create a view for latest status per registry item
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