-- SPA-881 Phase 1: Add sequence_day column to outreach_log
-- Tracks which step in the B2B prospect email sequence was sent (0, 3, 7, 14).
--
-- IMPORTANT: Column is NULLABLE with no default.
-- This prevents backfilling existing rows with sequence_day=0, which would cause
-- the prospect-sequence-processor to misinterpret legacy outreach_log entries.
-- Only rows created by prospect-lead-intake and prospect-sequence-processor
-- will have sequence_day set (all others remain NULL).
--
-- Also adds 'superseded' as a valid status for re-enrollment archiving.

ALTER TABLE outreach_log
  ADD COLUMN IF NOT EXISTS sequence_day INT;

-- Index for efficient sequence history lookups (prospect_id + sequence_day)
CREATE INDEX IF NOT EXISTS idx_outreach_log_prospect_sequence
  ON outreach_log(prospect_id, sequence_day)
  WHERE sequence_day IS NOT NULL;

-- Constraint: only valid sequence steps allowed
ALTER TABLE outreach_log
  ADD CONSTRAINT IF NOT EXISTS chk_outreach_log_sequence_day
  CHECK (sequence_day IS NULL OR sequence_day IN (0, 3, 7, 14));

-- Comment for documentation
COMMENT ON COLUMN outreach_log.sequence_day IS
  'Which day in the B2B prospect email sequence this entry represents (0=initial, 3=day3, 7=day7, 14=day14). NULL for non-sequence emails.';
