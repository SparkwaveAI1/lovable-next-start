-- Add content_hash column for idempotency protection against duplicate posts
ALTER TABLE scheduled_content 
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create unique index to prevent duplicate hashes from being posted
-- This is the KEY idempotency protection: same hash cannot exist twice in 'posted' status
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_content_posted_hash 
ON scheduled_content (content_hash) 
WHERE status = 'posted';

-- Add regular index for faster hash lookups during duplicate checks
CREATE INDEX IF NOT EXISTS idx_scheduled_content_hash 
ON scheduled_content (content_hash);

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_scheduled_content_status 
ON scheduled_content (status);

-- Add comment explaining the purpose
COMMENT ON COLUMN scheduled_content.content_hash IS 'SHA-256 hash of business_id|platform|content|scheduled_for for idempotency - prevents duplicate posts even if status updates fail';