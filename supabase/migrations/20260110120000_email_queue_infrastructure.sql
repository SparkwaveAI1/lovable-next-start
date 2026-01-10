-- ============================================
-- EMAIL QUEUE INFRASTRUCTURE
-- For large campaign sends with rate limiting
-- ============================================

-- Add 'queued' status to email_campaigns if not exists
DO $$
BEGIN
  ALTER TABLE public.email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_status_check;

  ALTER TABLE public.email_campaigns
  ADD CONSTRAINT email_campaigns_status_check
  CHECK (status IN ('draft', 'scheduled', 'queued', 'sending', 'sent', 'cancelled', 'paused'));
END $$;

-- EMAIL QUEUE: Individual emails waiting to be sent
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  resend_id TEXT,
  CONSTRAINT unique_campaign_contact_queue UNIQUE (campaign_id, contact_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for fetching pending emails (most common query)
CREATE INDEX IF NOT EXISTS idx_email_queue_pending
ON public.email_queue(status, created_at)
WHERE status = 'pending';

-- Index for retry logic
CREATE INDEX IF NOT EXISTS idx_email_queue_retry
ON public.email_queue(status, next_retry_at)
WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Index for campaign stats
CREATE INDEX IF NOT EXISTS idx_email_queue_campaign
ON public.email_queue(campaign_id, status);

-- Index for contact history
CREATE INDEX IF NOT EXISTS idx_email_queue_contact
ON public.email_queue(contact_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queue for accessible campaigns"
ON public.email_queue FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.email_campaigns ec
    WHERE ec.id = campaign_id AND public.can_access_business(ec.business_id)
  )
);

CREATE POLICY "Service role can manage queue"
ON public.email_queue FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- FUNCTION: Queue campaign emails
-- ============================================

CREATE OR REPLACE FUNCTION public.queue_campaign_emails(p_campaign_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queued_count INT;
  v_campaign RECORD;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign
  FROM public.email_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF v_campaign.status NOT IN ('draft', 'scheduled') THEN
    RAISE EXCEPTION 'Campaign must be in draft or scheduled status to queue';
  END IF;

  -- Insert recipients into queue
  INSERT INTO public.email_queue (campaign_id, contact_id, email, first_name, last_name)
  SELECT
    p_campaign_id,
    r.contact_id,
    r.email,
    r.first_name,
    r.last_name
  FROM public.get_campaign_recipients(p_campaign_id) r
  WHERE r.email IS NOT NULL AND r.email != ''
  ON CONFLICT (campaign_id, contact_id) DO NOTHING;

  GET DIAGNOSTICS queued_count = ROW_COUNT;

  -- Update campaign status and recipient count
  UPDATE public.email_campaigns
  SET
    status = 'queued',
    total_recipients = queued_count,
    updated_at = now()
  WHERE id = p_campaign_id;

  RETURN queued_count;
END;
$$;

-- ============================================
-- FUNCTION: Get next batch of emails to send
-- ============================================

CREATE OR REPLACE FUNCTION public.get_email_queue_batch(
  p_campaign_id UUID,
  p_batch_size INT DEFAULT 10
)
RETURNS TABLE (
  queue_id UUID,
  contact_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.email_queue eq
  SET
    status = 'processing',
    attempts = attempts + 1
  WHERE eq.id IN (
    SELECT eq2.id
    FROM public.email_queue eq2
    WHERE eq2.campaign_id = p_campaign_id
    AND eq2.status = 'pending'
    ORDER BY eq2.created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING eq.id AS queue_id, eq.contact_id, eq.email, eq.first_name, eq.last_name;
END;
$$;

-- ============================================
-- FUNCTION: Mark queue item as sent
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_queue_sent(
  p_queue_id UUID,
  p_resend_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_queue
  SET
    status = 'sent',
    processed_at = now(),
    resend_id = p_resend_id
  WHERE id = p_queue_id;
END;
$$;

-- ============================================
-- FUNCTION: Mark queue item as failed
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_queue_failed(
  p_queue_id UUID,
  p_error_message TEXT DEFAULT NULL,
  p_should_retry BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INT;
  v_max_attempts INT;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM public.email_queue
  WHERE id = p_queue_id;

  IF p_should_retry AND v_attempts < v_max_attempts THEN
    -- Schedule retry with exponential backoff (1min, 2min, 4min)
    UPDATE public.email_queue
    SET
      status = 'pending',
      error_message = p_error_message,
      next_retry_at = now() + (power(2, v_attempts - 1) * interval '1 minute')
    WHERE id = p_queue_id;
  ELSE
    -- Mark as permanently failed
    UPDATE public.email_queue
    SET
      status = 'failed',
      error_message = p_error_message,
      processed_at = now()
    WHERE id = p_queue_id;
  END IF;
END;
$$;

-- ============================================
-- FUNCTION: Get queue progress stats
-- ============================================

CREATE OR REPLACE FUNCTION public.get_queue_progress(p_campaign_id UUID)
RETURNS TABLE (
  total INT,
  pending INT,
  processing INT,
  sent INT,
  failed INT,
  skipped INT,
  percent_complete NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_pending INT;
  v_processing INT;
  v_sent INT;
  v_failed INT;
  v_skipped INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'processing'),
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'skipped')
  INTO v_total, v_pending, v_processing, v_sent, v_failed, v_skipped
  FROM public.email_queue
  WHERE campaign_id = p_campaign_id;

  RETURN QUERY SELECT
    v_total,
    v_pending,
    v_processing,
    v_sent,
    v_failed,
    v_skipped,
    CASE WHEN v_total > 0
      THEN ROUND((v_sent + v_failed + v_skipped)::NUMERIC / v_total * 100, 1)
      ELSE 0
    END;
END;
$$;

-- ============================================
-- FUNCTION: Clear campaign queue
-- ============================================

CREATE OR REPLACE FUNCTION public.clear_campaign_queue(p_campaign_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.email_queue
  WHERE campaign_id = p_campaign_id
  AND status IN ('pending', 'failed');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.email_queue IS 'Queue of individual emails for campaign batch processing';
COMMENT ON COLUMN public.email_queue.status IS 'pending=waiting, processing=being sent, sent=success, failed=permanent failure, skipped=intentionally skipped';
COMMENT ON COLUMN public.email_queue.attempts IS 'Number of send attempts made';
COMMENT ON COLUMN public.email_queue.next_retry_at IS 'When to retry failed sends (exponential backoff)';
COMMENT ON FUNCTION public.queue_campaign_emails IS 'Queues all campaign recipients for batch sending';
COMMENT ON FUNCTION public.get_email_queue_batch IS 'Gets next batch of emails to send with row locking';
COMMENT ON FUNCTION public.get_queue_progress IS 'Returns progress stats for a campaign queue';
