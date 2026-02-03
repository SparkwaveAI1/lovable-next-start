-- Create the tasks table for Mission Control
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked')),
    assignee_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    external_id TEXT,
    external_source TEXT CHECK (external_source IN ('notion', 'manual')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can restrict later)
CREATE POLICY "tasks_all" ON tasks FOR ALL USING (true);

-- Create indexes for efficient queries
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_priority_idx ON tasks(priority);
CREATE INDEX tasks_external_id_idx ON tasks(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX tasks_assignee_ids_idx ON tasks USING GIN(assignee_ids);
CREATE INDEX tasks_tags_idx ON tasks USING GIN(tags);

-- Add updated_at trigger
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Add foreign key constraint for current_task_id in agents table
ALTER TABLE agents 
ADD CONSTRAINT agents_current_task_id_fkey 
FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE SET NULL;