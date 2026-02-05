-- Migration: Workflows System
-- Created: 2026-02-05
-- INV-056: Create workflow trigger types

-- =============================================================================
-- TABLE: workflows
-- User-configured automation workflows
-- =============================================================================
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger configuration (what starts the workflow)
  trigger JSONB NOT NULL,
  -- Example: {"type": "investment_alert", "config": {"anyAlert": true}}
  
  -- Actions to execute (in order)
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [{"type": "send_email", "config": {"to": "user@example.com"}}]
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_business_id ON workflows(business_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows((trigger->>'type'));

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own workflows" ON workflows;
CREATE POLICY "Users can view their own workflows" ON workflows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own workflows" ON workflows;
CREATE POLICY "Users can insert their own workflows" ON workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own workflows" ON workflows;
CREATE POLICY "Users can update their own workflows" ON workflows
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own workflows" ON workflows;
CREATE POLICY "Users can delete their own workflows" ON workflows
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- TABLE: workflow_executions
-- Log of workflow executions for debugging and audit
-- =============================================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  payload JSONB,
  actions_executed TEXT[],
  success BOOLEAN NOT NULL,
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_executed_at ON workflow_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_success ON workflow_executions(success);

-- RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view executions of their workflows" ON workflow_executions;
CREATE POLICY "Users can view executions of their workflows" ON workflow_executions
  FOR SELECT USING (
    workflow_id IS NULL OR
    EXISTS (
      SELECT 1 FROM workflows w 
      WHERE w.id = workflow_executions.workflow_id 
      AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can insert executions" ON workflow_executions;
CREATE POLICY "Service role can insert executions" ON workflow_executions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE workflows IS 'User-configured automation workflows triggered by events';
COMMENT ON TABLE workflow_executions IS 'Log of workflow executions for debugging';
COMMENT ON COLUMN workflows.trigger IS 'Trigger config: {type: "investment_alert"|"scheduled"|"manual", config: {...}}';
COMMENT ON COLUMN workflows.actions IS 'Array of actions: [{type: "send_email"|"discord"|"webhook", config: {...}}]';
