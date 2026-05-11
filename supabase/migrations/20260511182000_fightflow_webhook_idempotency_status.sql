-- FightFlow webhook idempotency hardening
-- Adds explicit processing/processed/failed state so Wix retries are not lost
-- when a webhook reserves a dedup key but later processing fails.

ALTER TABLE public.webhook_submissions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS idempotency_source TEXT NOT NULL DEFAULT 'submission_id',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.webhook_submissions
  DROP CONSTRAINT IF EXISTS webhook_submissions_status_check;

ALTER TABLE public.webhook_submissions
  ADD CONSTRAINT webhook_submissions_status_check
  CHECK (status IN ('processing', 'processed', 'failed'));

ALTER TABLE public.webhook_submissions
  DROP CONSTRAINT IF EXISTS webhook_submissions_idempotency_source_check;

ALTER TABLE public.webhook_submissions
  ADD CONSTRAINT webhook_submissions_idempotency_source_check
  CHECK (idempotency_source IN ('submission_id', 'payload_hash'));

CREATE INDEX IF NOT EXISTS idx_webhook_submissions_status_lookup
  ON public.webhook_submissions(business_id, status, processed_at);

COMMENT ON COLUMN public.webhook_submissions.status IS
  'Webhook processing state. processing/processed duplicates are skipped; failed rows can be retried.';
COMMENT ON COLUMN public.webhook_submissions.idempotency_source IS
  'Whether submission_id came from Wix submissionId or deterministic payload hash fallback.';
