-- SPA-432: Add resend_message_id and bounced_at to outreach_log
-- Enables CI email open/bounce tracking via resend-webhook

ALTER TABLE outreach_log
  ADD COLUMN IF NOT EXISTS resend_message_id TEXT,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_outreach_log_resend_message_id 
  ON outreach_log(resend_message_id) WHERE resend_message_id IS NOT NULL;
