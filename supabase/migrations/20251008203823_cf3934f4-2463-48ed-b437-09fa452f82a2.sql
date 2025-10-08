-- Add status and curation fields to scheduled_content
ALTER TABLE scheduled_content
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_scheduled_content_approval 
  ON scheduled_content(approval_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_tags 
  ON scheduled_content USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_keywords 
  ON scheduled_content USING GIN(keywords);

-- Create rejected content archive table
CREATE TABLE IF NOT EXISTS rejected_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  platform VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  topic VARCHAR(255),
  keywords TEXT[],
  tags TEXT[],
  rejection_reason TEXT NOT NULL,
  rejected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  rejected_by UUID,
  generation_params JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rejected_content_business 
  ON rejected_content(business_id, rejected_at DESC);

CREATE INDEX IF NOT EXISTS idx_rejected_content_reason 
  ON rejected_content(rejection_reason);

-- Enable RLS
ALTER TABLE rejected_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read rejected_content"
  ON rejected_content FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert rejected_content"
  ON rejected_content FOR INSERT
  WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN scheduled_content.approval_status IS 'Status: pending, approved, rejected';
COMMENT ON COLUMN scheduled_content.rejection_reason IS 'Why the content was rejected - used for learning';
COMMENT ON TABLE rejected_content IS 'Archive of rejected content for analysis and training';