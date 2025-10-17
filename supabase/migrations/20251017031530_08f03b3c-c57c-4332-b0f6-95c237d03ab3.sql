-- Add late_profile_id column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS late_profile_id TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN businesses.late_profile_id IS 'Late API profile ID - each business has its own Late profile with separate social accounts';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_late_profile_id ON businesses(late_profile_id);