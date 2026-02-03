-- Create the notifications table for Mission Control
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentioned_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    from_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can restrict later)
CREATE POLICY "notifications_all" ON notifications FOR ALL USING (true);

-- Create indexes for efficient queries
CREATE INDEX notifications_mentioned_agent_id_idx ON notifications(mentioned_agent_id);
CREATE INDEX notifications_delivered_idx ON notifications(delivered) WHERE delivered = false;
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX notifications_task_id_idx ON notifications(task_id) WHERE task_id IS NOT NULL;

-- Create a function to automatically create notifications when agents are mentioned in messages
CREATE OR REPLACE FUNCTION create_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
    agent_name TEXT;
    mentioned_agent_id UUID;
BEGIN
    -- Look for @mentions in the message content
    -- For now, we'll look for @Rico mentions specifically
    IF NEW.content ILIKE '%@rico%' THEN
        SELECT id INTO mentioned_agent_id 
        FROM agents 
        WHERE LOWER(name) = 'rico' 
        LIMIT 1;
        
        IF mentioned_agent_id IS NOT NULL AND mentioned_agent_id != NEW.from_agent_id THEN
            INSERT INTO notifications (mentioned_agent_id, from_agent_id, task_id, content)
            SELECT 
                mentioned_agent_id,
                NEW.from_agent_id,
                NEW.task_id,
                'You were mentioned in a comment on task: ' || t.title
            FROM tasks t
            WHERE t.id = NEW.task_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message notifications
CREATE TRIGGER message_notification_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notifications();