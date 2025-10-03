-- Add pipeline management fields to contacts table
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(50) DEFAULT 'sales_lead',
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS interested_programs TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP WITH TIME ZONE;

-- Add index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline 
  ON contacts(lead_type, pipeline_stage, last_activity_date DESC);

-- Add index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up 
  ON contacts(next_follow_up_date) 
  WHERE next_follow_up_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN contacts.lead_type IS 'Type of lead: sales_lead, freeze_request, cancellation_request, or service_request';
COMMENT ON COLUMN contacts.pipeline_stage IS 'Current stage in sales pipeline or service request status';
COMMENT ON COLUMN contacts.interested_programs IS 'Array of programs contact is interested in: boxing, muay-thai, jiu-jitsu, etc';