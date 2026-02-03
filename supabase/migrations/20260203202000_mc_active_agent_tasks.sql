-- Mission Control: Active Agent Tasks table
-- Tracks live/running tasks for agents and subagents

CREATE TABLE mc_active_agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES mc_agents(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('primary', 'subagent', 'builtin')),
  task_description TEXT NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'waiting', 'completed', 'error')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress INTEGER CHECK (progress >= 0 AND progress <= 100),
  metadata JSONB DEFAULT '{}',
  parent_agent_id UUID REFERENCES mc_agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_mc_active_agent_tasks_business ON mc_active_agent_tasks(business_id);
CREATE INDEX idx_mc_active_agent_tasks_status ON mc_active_agent_tasks(status) WHERE status = 'running';
CREATE INDEX idx_mc_active_agent_tasks_agent ON mc_active_agent_tasks(agent_id);

-- RLS policies (matching pattern used by other mc_* tables)
ALTER TABLE mc_active_agent_tasks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Allow authenticated read mc_active_agent_tasks" ON mc_active_agent_tasks
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert
CREATE POLICY "Allow authenticated insert mc_active_agent_tasks" ON mc_active_agent_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated users can update
CREATE POLICY "Allow authenticated update mc_active_agent_tasks" ON mc_active_agent_tasks
  FOR UPDATE TO authenticated USING (true);

-- Authenticated users can delete
CREATE POLICY "Allow authenticated delete mc_active_agent_tasks" ON mc_active_agent_tasks
  FOR DELETE TO authenticated USING (true);

-- Service role has full access
CREATE POLICY "Allow service role full access mc_active_agent_tasks" ON mc_active_agent_tasks
  FOR ALL TO service_role USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mc_active_agent_tasks;
