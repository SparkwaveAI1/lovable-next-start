-- Create the agents table for Mission Control
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('lead', 'specialist', 'intern')),
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'working', 'blocked')),
    current_task_id UUID DEFAULT NULL,
    session_key TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can restrict later)
CREATE POLICY "agents_all" ON agents FOR ALL USING (true);

-- Create index on session_key for lookups
CREATE INDEX agents_session_key_idx ON agents(session_key);

-- Create index on status for filtering
CREATE INDEX agents_status_idx ON agents(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();