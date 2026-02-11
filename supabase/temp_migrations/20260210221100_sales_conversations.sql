-- Sales Conversations table for tracking multi-touch sales interactions
-- Part of Rico-Sales pipeline management

CREATE TABLE IF NOT EXISTS sales_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'engaged', 'helpful', 'intel_gathered', 'call_scheduled', 'closed')),
  last_touch timestamptz DEFAULT now(),
  next_action text,
  intel_gathered jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for quick lookups by contact
CREATE INDEX IF NOT EXISTS idx_sales_conversations_contact_id ON sales_conversations(contact_id);

-- Index for filtering by stage
CREATE INDEX IF NOT EXISTS idx_sales_conversations_stage ON sales_conversations(stage);

-- Index for sorting by last touch
CREATE INDEX IF NOT EXISTS idx_sales_conversations_last_touch ON sales_conversations(last_touch DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_sales_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_conversations_updated_at
  BEFORE UPDATE ON sales_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_conversations_updated_at();

-- RLS policies
ALTER TABLE sales_conversations ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on sales_conversations"
  ON sales_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE sales_conversations IS 'Tracks multi-touch sales conversations with stage progression and intel gathering';
COMMENT ON COLUMN sales_conversations.stage IS 'Pipeline stage: new → engaged → helpful → intel_gathered → call_scheduled → closed';
COMMENT ON COLUMN sales_conversations.intel_gathered IS 'JSONB containing pain_points, current_tools, budget_signals';
