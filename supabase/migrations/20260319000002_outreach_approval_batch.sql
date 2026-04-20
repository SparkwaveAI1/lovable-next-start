-- SPA-317: Dedicated outreach_batches table for referential integrity
-- batch_id in outreach_log is a FK to this table

CREATE TABLE IF NOT EXISTS outreach_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  created_by TEXT DEFAULT 'iris',
  status TEXT NOT NULL DEFAULT 'pending_approval',  -- pending_approval | approved | rejected
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Enforce: only one of approved_at/rejected_at can be set
  CONSTRAINT chk_approval_xor CHECK (
    NOT (approved_at IS NOT NULL AND rejected_at IS NOT NULL)
  )
);

-- outreach_log references outreach_batches
ALTER TABLE outreach_log
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES outreach_batches(id) ON DELETE SET NULL;

-- outreach_log.status already TEXT — pending_approval is a valid value
CREATE INDEX IF NOT EXISTS idx_outreach_log_batch_id ON outreach_log(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_batches_status ON outreach_batches(status) WHERE status = 'pending_approval';
