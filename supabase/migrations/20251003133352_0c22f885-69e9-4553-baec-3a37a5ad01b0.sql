-- Create table for tracking all contact interactions and activities
CREATE TABLE IF NOT EXISTS contact_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraint to ensure activity_type is valid
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN (
      'note',
      'status_change',
      'stage_change',
      'sms_sent',
      'sms_received',
      'call',
      'email',
      'booking',
      'follow_up_scheduled',
      'follow_up_completed',
      'form_submission'
    )
  )
);

-- Create index for querying activities by contact
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact 
  ON contact_activities(contact_id, created_at DESC);

-- Create index for querying by activity type
CREATE INDEX IF NOT EXISTS idx_contact_activities_type 
  ON contact_activities(activity_type, created_at DESC);

-- Enable RLS
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (read-only for now, will add write policies later)
CREATE POLICY "Allow read access to contact_activities"
  ON contact_activities FOR SELECT
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE contact_activities IS 'Tracks all interactions and activities for each contact';
COMMENT ON COLUMN contact_activities.activity_data IS 'Flexible JSONB storage for activity-specific data';