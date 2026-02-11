-- Sales Metrics Tracking for Rico-Sales
-- Tracks daily sales activities: prospects researched, outreach drafted, emails sent, responses, meetings booked

CREATE TABLE IF NOT EXISTS sales_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    agent_id UUID REFERENCES mc_agents(id),
    
    -- Core metrics
    prospects_researched INTEGER DEFAULT 0,
    outreach_drafted INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    meetings_booked INTEGER DEFAULT 0,
    
    -- Additional context
    sms_sent INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One row per agent per day
    UNIQUE(date, agent_id)
);

-- Index for date range queries
CREATE INDEX idx_sales_daily_metrics_date ON sales_daily_metrics(date);
CREATE INDEX idx_sales_daily_metrics_agent_date ON sales_daily_metrics(agent_id, date);

-- Individual activity log for granular tracking
CREATE TABLE IF NOT EXISTS sales_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES mc_agents(id),
    
    -- Activity type
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'prospect_researched',
        'outreach_drafted',
        'email_sent',
        'response_received',
        'meeting_booked',
        'sms_sent',
        'call_made'
    )),
    
    -- Context
    prospect_name TEXT,
    company_name TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_activities_type ON sales_activities(activity_type);
CREATE INDEX idx_sales_activities_created ON sales_activities(created_at);
CREATE INDEX idx_sales_activities_agent ON sales_activities(agent_id);

-- Function to auto-update daily metrics when activities are logged
CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS TRIGGER AS $$
DECLARE
    metric_col TEXT;
BEGIN
    -- Map activity type to metric column
    CASE NEW.activity_type
        WHEN 'prospect_researched' THEN metric_col := 'prospects_researched';
        WHEN 'outreach_drafted' THEN metric_col := 'outreach_drafted';
        WHEN 'email_sent' THEN metric_col := 'emails_sent';
        WHEN 'response_received' THEN metric_col := 'responses_received';
        WHEN 'meeting_booked' THEN metric_col := 'meetings_booked';
        WHEN 'sms_sent' THEN metric_col := 'sms_sent';
        WHEN 'call_made' THEN metric_col := 'calls_made';
        ELSE RETURN NEW;
    END CASE;
    
    -- Upsert daily metrics
    INSERT INTO sales_daily_metrics (date, agent_id)
    VALUES (CURRENT_DATE, NEW.agent_id)
    ON CONFLICT (date, agent_id) DO NOTHING;
    
    -- Increment the appropriate column
    EXECUTE format(
        'UPDATE sales_daily_metrics SET %I = %I + 1, updated_at = NOW() WHERE date = CURRENT_DATE AND agent_id = $1',
        metric_col, metric_col
    ) USING NEW.agent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_daily_metrics
    AFTER INSERT ON sales_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_metrics();

-- Enable RLS
ALTER TABLE sales_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access metrics" ON sales_daily_metrics
    FOR ALL USING (auth.role() = 'service_role');
    
CREATE POLICY "Service role full access activities" ON sales_activities
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE sales_daily_metrics IS 'Aggregated daily sales metrics per agent';
COMMENT ON TABLE sales_activities IS 'Individual sales activity log for granular tracking';
