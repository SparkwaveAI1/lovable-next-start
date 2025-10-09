-- Add column for GAME Twitter access tokens to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS game_twitter_token TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN businesses.game_twitter_token IS 'GAME Twitter access token (format: apx-xxxxx) for automated posting via Virtuals Protocol';