-- Add essential performance indexes to scheduled_content table
CREATE INDEX IF NOT EXISTS idx_scheduled_content_business_date 
ON scheduled_content(business_id, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_status 
ON scheduled_content(status);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_platform 
ON scheduled_content(platform);

-- Add index for querying by creation date
CREATE INDEX IF NOT EXISTS idx_scheduled_content_created 
ON scheduled_content(created_at);