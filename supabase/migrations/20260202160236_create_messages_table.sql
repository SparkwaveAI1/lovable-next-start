-- Create the messages table for Mission Control (comments on tasks)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can restrict later)
CREATE POLICY "messages_all" ON messages FOR ALL USING (true);

-- Create indexes for efficient queries
CREATE INDEX messages_task_id_idx ON messages(task_id);
CREATE INDEX messages_from_agent_id_idx ON messages(from_agent_id);
CREATE INDEX messages_created_at_idx ON messages(created_at DESC);
CREATE INDEX messages_attachments_idx ON messages USING GIN(attachments) WHERE array_length(attachments, 1) > 0;