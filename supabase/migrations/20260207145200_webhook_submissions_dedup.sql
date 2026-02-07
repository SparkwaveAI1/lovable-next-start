-- Webhook submissions deduplication table
-- Fixes race condition where Wix sends contact_created + contact_updated within ~130ms

CREATE TABLE IF NOT EXISTS webhook_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint ensures only one row per submission per business
  UNIQUE(submission_id, business_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_submissions_lookup 
  ON webhook_submissions(submission_id, business_id);

-- Add comment
COMMENT ON TABLE webhook_submissions IS 'Atomic deduplication for webhook processing. Uses unique constraint instead of check-then-insert to prevent race conditions.';

-- RLS policy (if needed, allow service role full access)
ALTER TABLE webhook_submissions ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "Service role has full access" ON webhook_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Cleanup old submissions after 30 days to keep table small
-- This can be done via a cron job or Supabase scheduled function
