-- Create the activities table for Mission Control (activity feed)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('task_created', 'task_updated', 'message_sent', 'document_created', 'status_changed', 'agent_assigned')),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can restrict later)
CREATE POLICY "activities_all" ON activities FOR ALL USING (true);

-- Create indexes for efficient queries
CREATE INDEX activities_created_at_idx ON activities(created_at DESC);
CREATE INDEX activities_agent_id_idx ON activities(agent_id);
CREATE INDEX activities_task_id_idx ON activities(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX activities_type_idx ON activities(type);

-- Create a function to automatically create activity when tasks are created/updated
CREATE OR REPLACE FUNCTION create_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activities (type, agent_id, task_id, message, metadata)
        SELECT 
            'task_created',
            a.id,
            NEW.id,
            a.name || ' created task: ' || NEW.title,
            jsonb_build_object('task_status', NEW.status, 'priority', NEW.priority)
        FROM agents a
        WHERE a.session_key = 'agent:main:main'; -- Rico for now
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO activities (type, agent_id, task_id, message, metadata)
            SELECT 
                'status_changed',
                a.id,
                NEW.id,
                a.name || ' changed task status from ' || OLD.status || ' to ' || NEW.status || ': ' || NEW.title,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
            FROM agents a
            WHERE a.session_key = 'agent:main:main'; -- Rico for now
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task activities
CREATE TRIGGER task_activity_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_task_activity();