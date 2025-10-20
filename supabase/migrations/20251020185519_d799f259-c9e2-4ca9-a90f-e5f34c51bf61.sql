-- Drop the trigger if it exists (it was created incorrectly without the column)
DROP TRIGGER IF EXISTS update_scheduled_content_updated_at ON scheduled_content;

-- Add updated_at column to scheduled_content table
ALTER TABLE scheduled_content 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Re-create trigger to auto-update the timestamp using existing function
CREATE TRIGGER update_scheduled_content_updated_at 
    BEFORE UPDATE ON scheduled_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Backfill existing rows with created_at or posted_at values
UPDATE scheduled_content 
SET updated_at = COALESCE(posted_at, created_at, NOW())
WHERE updated_at IS NULL;