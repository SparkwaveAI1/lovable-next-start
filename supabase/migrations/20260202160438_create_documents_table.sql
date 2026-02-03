-- Create the documents table for Mission Control
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL DEFAULT 'notes' CHECK (type IN ('deliverable', 'research', 'protocol', 'notes')),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    created_by_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can restrict later)
CREATE POLICY "documents_all" ON documents FOR ALL USING (true);

-- Create indexes for efficient queries
CREATE INDEX documents_task_id_idx ON documents(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX documents_created_by_agent_id_idx ON documents(created_by_agent_id);
CREATE INDEX documents_type_idx ON documents(type);
CREATE INDEX documents_created_at_idx ON documents(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Create a function to automatically create activity when documents are created
CREATE OR REPLACE FUNCTION create_document_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activities (type, agent_id, task_id, message, metadata)
        SELECT 
            'document_created',
            NEW.created_by_agent_id,
            NEW.task_id,
            a.name || ' created document: ' || NEW.title,
            jsonb_build_object('document_type', NEW.type, 'document_id', NEW.id)
        FROM agents a
        WHERE a.id = NEW.created_by_agent_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document activities
CREATE TRIGGER document_activity_trigger
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_activity();