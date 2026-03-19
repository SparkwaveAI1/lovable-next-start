-- SPA-847: Speed-to-Lead — re-engagement queue
-- Stores scheduled follow-up attempts for leads who don't reply

CREATE TABLE IF NOT EXISTS public.fightflow_reengagement_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       TEXT NOT NULL,
  business_id     TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('no_reply','mid_convo_drop')),
  attempt         INTEGER NOT NULL DEFAULT 1,
  max_attempts    INTEGER NOT NULL DEFAULT 2,
  fire_at         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled','skipped_quiet')),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reengagement_pending
  ON public.fightflow_reengagement_queue (status, fire_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reengagement_thread
  ON public.fightflow_reengagement_queue (thread_id, status);

-- RLS: service role only
ALTER TABLE public.fightflow_reengagement_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.fightflow_reengagement_queue
  FOR ALL USING (auth.role() = 'service_role');
