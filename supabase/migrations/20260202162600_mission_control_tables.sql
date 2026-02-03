-- Mission Control Tables
-- Created: 2026-02-02

-- Agent Status enum
CREATE TYPE mc_agent_status AS ENUM ('working', 'idle', 'blocked');

-- Agent Level enum
CREATE TYPE mc_agent_level AS ENUM ('lead', 'specialist', 'intern');

-- Task Status enum
CREATE TYPE mc_task_status AS ENUM ('inbox', 'assigned', 'in_progress', 'review', 'done');

-- Task Priority enum
CREATE TYPE mc_task_priority AS ENUM ('critical', 'high', 'medium', 'low');

-- Activity Type enum
CREATE TYPE mc_activity_type AS ENUM (
  'task_created', 
  'task_updated', 
  'status_changed', 
  'message_sent', 
  'decision_made', 
  'document_created'
);

-- Agents table
CREATE TABLE mc_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  level mc_agent_level NOT NULL DEFAULT 'intern',
  status mc_agent_status NOT NULL DEFAULT 'idle',
  current_task_id UUID,
  session_key TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE mc_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status mc_task_status NOT NULL DEFAULT 'inbox',
  assignee_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  priority mc_task_priority NOT NULL DEFAULT 'medium',
  external_id TEXT,
  external_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activities table
CREATE TABLE mc_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type mc_activity_type NOT NULL,
  agent_id UUID REFERENCES mc_agents(id) ON DELETE SET NULL,
  task_id UUID REFERENCES mc_tasks(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table (task comments)
CREATE TABLE mc_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES mc_tasks(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES mc_agents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key for current_task_id in agents (added after tasks table exists)
ALTER TABLE mc_agents 
  ADD CONSTRAINT fk_agent_current_task 
  FOREIGN KEY (current_task_id) 
  REFERENCES mc_tasks(id) 
  ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_mc_tasks_status ON mc_tasks(status);
CREATE INDEX idx_mc_tasks_priority ON mc_tasks(priority);
CREATE INDEX idx_mc_activities_created_at ON mc_activities(created_at DESC);
CREATE INDEX idx_mc_activities_agent_id ON mc_activities(agent_id);
CREATE INDEX idx_mc_activities_task_id ON mc_activities(task_id);
CREATE INDEX idx_mc_messages_task_id ON mc_messages(task_id);
CREATE INDEX idx_mc_agents_status ON mc_agents(status);

-- Trigger for updated_at on agents
CREATE OR REPLACE FUNCTION update_mc_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mc_agents_updated_at
  BEFORE UPDATE ON mc_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_mc_agents_updated_at();

-- Trigger for updated_at on tasks
CREATE OR REPLACE FUNCTION update_mc_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mc_tasks_updated_at
  BEFORE UPDATE ON mc_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_mc_tasks_updated_at();

-- Enable Row Level Security (public read for now, can tighten later)
ALTER TABLE mc_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users full access)
CREATE POLICY "Allow authenticated read mc_agents" ON mc_agents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert mc_agents" ON mc_agents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update mc_agents" ON mc_agents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read mc_tasks" ON mc_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert mc_tasks" ON mc_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update mc_tasks" ON mc_tasks
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read mc_activities" ON mc_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert mc_activities" ON mc_activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read mc_messages" ON mc_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert mc_messages" ON mc_messages
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow service role full access (for backend operations)
CREATE POLICY "Allow service role full access mc_agents" ON mc_agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access mc_tasks" ON mc_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access mc_activities" ON mc_activities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access mc_messages" ON mc_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert seed data: Rico agent
INSERT INTO mc_agents (name, role, level, status, session_key) VALUES
  ('Rico', 'Personal Assistant', 'lead', 'working', 'rico-main');

-- Insert seed task: Build Mission Control UI
INSERT INTO mc_tasks (title, description, status, priority, tags) VALUES
  ('Build Mission Control UI', 'Create Mission Control dashboard for Sparkwave with agents sidebar, kanban board, and activity feed', 'in_progress', 'high', ARRAY['ui', 'dashboard', 'sparkwave']);

-- Log the task creation activity
INSERT INTO mc_activities (type, agent_id, task_id, message)
SELECT 
  'task_created',
  a.id,
  t.id,
  'Created task: Build Mission Control UI'
FROM mc_agents a, mc_tasks t
WHERE a.session_key = 'rico-main' 
  AND t.title = 'Build Mission Control UI';

COMMENT ON TABLE mc_agents IS 'Mission Control agents (AI assistants)';
COMMENT ON TABLE mc_tasks IS 'Mission Control tasks with kanban status';
COMMENT ON TABLE mc_activities IS 'Activity feed for Mission Control';
COMMENT ON TABLE mc_messages IS 'Task comments/messages';
