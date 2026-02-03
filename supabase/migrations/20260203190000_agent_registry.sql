-- Agent Registry Migration
-- Real-time monitoring and documentation system for AI agents

-- Agent definitions (the "registry")
CREATE TABLE IF NOT EXISTS agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Lead Response Bot", "Follow-up Agent"
  slug TEXT NOT NULL,                    -- "lead-response-bot"
  description TEXT,                      -- Short description
  full_documentation TEXT,               -- Full markdown documentation
  capabilities JSONB DEFAULT '[]'::JSONB,  -- List of what it can do
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  config JSONB DEFAULT '{}'::JSONB,      -- Agent-specific config
  icon TEXT DEFAULT 'bot',               -- Lucide icon name
  color TEXT DEFAULT 'violet',           -- Theme color
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, slug)
);

-- Real-time agent status (what they're doing NOW)
CREATE TABLE IF NOT EXISTS agent_registry_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_registry(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('idle', 'working', 'waiting', 'error')),
  current_task TEXT,                     -- "Processing lead inquiry from John"
  started_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,    -- Additional context
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent activity log (history of what they did)
CREATE TABLE IF NOT EXISTS agent_registry_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_registry(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('task_started', 'task_completed', 'error', 'message_sent', 'decision_made', 'api_call', 'config_changed')),
  description TEXT,                      -- Human-readable description
  details JSONB DEFAULT '{}'::JSONB,     -- Full details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_registry_business ON agent_registry(business_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_slug ON agent_registry(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_agent_registry_status_agent ON agent_registry_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_activity_agent ON agent_registry_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_activity_created ON agent_registry_activity(created_at DESC);

-- Enable RLS
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_registry
CREATE POLICY "Users can view agents for their businesses"
  ON agent_registry FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM user_business_permissions
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users with edit permission can insert agents"
  ON agent_registry FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_permissions
      WHERE user_id = auth.uid() AND permission_level IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users with edit permission can update agents"
  ON agent_registry FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM user_business_permissions
      WHERE user_id = auth.uid() AND permission_level IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Service role can do anything on agent_registry"
  ON agent_registry FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for agent_registry_status
CREATE POLICY "Users can view status for their business agents"
  ON agent_registry_status FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agent_registry WHERE business_id IN (
        SELECT business_id FROM user_business_permissions
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage agent_registry_status"
  ON agent_registry_status FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for agent_registry_activity
CREATE POLICY "Users can view activity for their business agents"
  ON agent_registry_activity FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agent_registry WHERE business_id IN (
        SELECT business_id FROM user_business_permissions
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage agent_registry_activity"
  ON agent_registry_activity FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger to update agent_registry.updated_at
CREATE OR REPLACE FUNCTION update_agent_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_registry_updated_at
  BEFORE UPDATE ON agent_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_registry_timestamp();

-- Trigger to update agent_registry_status.updated_at
CREATE TRIGGER agent_registry_status_updated_at
  BEFORE UPDATE ON agent_registry_status
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_registry_timestamp();

-- Enable realtime for status and activity tables
ALTER PUBLICATION supabase_realtime ADD TABLE agent_registry_status;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_registry_activity;

-- Create a function to upsert agent status (for use by backend services)
CREATE OR REPLACE FUNCTION upsert_agent_status(
  p_agent_id UUID,
  p_status TEXT,
  p_current_task TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_status_id UUID;
BEGIN
  -- Try to update existing status
  UPDATE agent_registry_status
  SET 
    status = p_status,
    current_task = p_current_task,
    metadata = p_metadata,
    updated_at = NOW(),
    started_at = CASE WHEN status != p_status THEN NOW() ELSE started_at END
  WHERE agent_id = p_agent_id
  RETURNING id INTO v_status_id;
  
  -- If no existing status, insert new one
  IF v_status_id IS NULL THEN
    INSERT INTO agent_registry_status (agent_id, status, current_task, metadata)
    VALUES (p_agent_id, p_status, p_current_task, p_metadata)
    RETURNING id INTO v_status_id;
  END IF;
  
  RETURN v_status_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION upsert_agent_status TO service_role;
