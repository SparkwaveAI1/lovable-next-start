-- Add error tracking columns to audit_results for follow-up retry logic
-- Issue: Follow-up emails may fail silently; need to track attempts and errors

ALTER TABLE public.audit_results 
ADD COLUMN IF NOT EXISTS followup_error TEXT,
ADD COLUMN IF NOT EXISTS followup_attempted_at TIMESTAMPTZ;

-- Index for finding failed follow-ups that need retry
CREATE INDEX IF NOT EXISTS idx_audit_results_followup_retry 
ON public.audit_results(followup_attempted_at) 
WHERE followup_sent_at IS NULL AND followup_error IS NOT NULL;

COMMENT ON COLUMN public.audit_results.followup_error IS 'Error message if follow-up email failed';
COMMENT ON COLUMN public.audit_results.followup_attempted_at IS 'When follow-up was last attempted (even if failed)';
