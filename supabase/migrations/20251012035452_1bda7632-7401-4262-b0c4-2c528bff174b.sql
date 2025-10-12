-- Add Late account ID columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS late_twitter_account_id TEXT,
ADD COLUMN IF NOT EXISTS late_instagram_account_id TEXT,
ADD COLUMN IF NOT EXISTS late_tiktok_account_id TEXT,
ADD COLUMN IF NOT EXISTS late_linkedin_account_id TEXT,
ADD COLUMN IF NOT EXISTS late_facebook_account_id TEXT;

COMMENT ON COLUMN businesses.late_twitter_account_id IS 'Late API account ID for Twitter';
COMMENT ON COLUMN businesses.late_instagram_account_id IS 'Late API account ID for Instagram';
COMMENT ON COLUMN businesses.late_tiktok_account_id IS 'Late API account ID for TikTok';
COMMENT ON COLUMN businesses.late_linkedin_account_id IS 'Late API account ID for LinkedIn';
COMMENT ON COLUMN businesses.late_facebook_account_id IS 'Late API account ID for Facebook';