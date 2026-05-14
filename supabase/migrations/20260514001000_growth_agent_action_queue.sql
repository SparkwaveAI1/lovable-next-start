-- Growth Agent phase-1 action queue
-- Browser clients enqueue safe draft/recommendation intents through growth-agent-enqueue.
-- Hermes worker claims and completes rows through service-role-only RPCs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.growth_agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'growth_brief.generate',
    'outreach_draft.generate',
    'campaign_ideas.generate',
    'record_summary.generate'
  )),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'needs_approval', 'approved', 'processing', 'completed', 'failed', 'cancelled'
  )),
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NULL,
  result_markdown TEXT NULL,
  proposed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  locked_at TIMESTAMPTZ NULL,
  locked_by TEXT NULL,
  last_heartbeat TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT growth_agent_actions_idempotency_unique UNIQUE (business_id, user_id, idempotency_key),
  CONSTRAINT growth_agent_actions_phase1_requires_approval CHECK (approval_required = TRUE),
  CONSTRAINT growth_agent_actions_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT growth_agent_actions_proposed_actions_array CHECK (jsonb_typeof(proposed_actions) = 'array')
);

CREATE TABLE IF NOT EXISTS public.growth_agent_action_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.growth_agent_actions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'queued', 'approved', 'claimed', 'tool_start', 'tool_complete', 'progress', 'completed', 'failed', 'cancelled'
  )),
  message TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT growth_agent_action_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_growth_agent_actions_business_status_created
  ON public.growth_agent_actions (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_agent_actions_user_created
  ON public.growth_agent_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_agent_actions_rate_limit
  ON public.growth_agent_actions (business_id, user_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_agent_actions_worker_claim
  ON public.growth_agent_actions (status, locked_at, created_at ASC)
  WHERE status IN ('queued', 'approved', 'processing');
CREATE INDEX IF NOT EXISTS idx_growth_agent_action_events_action_created
  ON public.growth_agent_action_events (action_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.set_growth_agent_actions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_growth_agent_actions_updated_at ON public.growth_agent_actions;
CREATE TRIGGER trg_growth_agent_actions_updated_at
  BEFORE UPDATE ON public.growth_agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_growth_agent_actions_updated_at();

ALTER TABLE public.growth_agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_agent_action_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their growth agent actions" ON public.growth_agent_actions;
CREATE POLICY "Users can view their growth agent actions"
  ON public.growth_agent_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_business(business_id));

DROP POLICY IF EXISTS "Users can insert own queued growth agent actions" ON public.growth_agent_actions;
CREATE POLICY "Users can insert own queued growth agent actions"
  ON public.growth_agent_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_business(business_id)
    AND status = 'queued'
    AND approval_required = true
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND result IS NULL
    AND result_markdown IS NULL
    AND proposed_actions = '[]'::jsonb
    AND error_message IS NULL
    AND locked_at IS NULL
    AND locked_by IS NULL
  );

DROP POLICY IF EXISTS "Users can view growth agent action events" ON public.growth_agent_action_events;
CREATE POLICY "Users can view growth agent action events"
  ON public.growth_agent_action_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.growth_agent_actions gaa
      WHERE gaa.id = growth_agent_action_events.action_id
        AND (gaa.user_id = auth.uid() OR public.can_access_business(gaa.business_id))
    )
  );

GRANT SELECT, INSERT ON public.growth_agent_actions TO authenticated;
GRANT SELECT ON public.growth_agent_action_events TO authenticated;
REVOKE UPDATE, DELETE ON public.growth_agent_actions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.growth_agent_action_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_next_growth_agent_action(
  p_worker_id text,
  p_safe_action_types text[] DEFAULT ARRAY[
    'growth_brief.generate',
    'outreach_draft.generate',
    'campaign_ideas.generate',
    'record_summary.generate'
  ],
  p_stale_after_seconds integer DEFAULT 900
)
RETURNS public.growth_agent_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_action public.growth_agent_actions;
BEGIN
  IF coalesce(p_worker_id, '') = '' THEN
    RAISE EXCEPTION 'worker id is required';
  END IF;

  WITH candidate AS (
    SELECT id
    FROM public.growth_agent_actions
    WHERE status IN ('queued', 'approved', 'processing')
      AND (
        (status = 'queued' AND action_type = ANY(p_safe_action_types))
        OR status = 'approved'
        OR (status = 'processing' AND locked_at < now() - make_interval(secs => p_stale_after_seconds))
      )
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.growth_agent_actions a
  SET status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      last_heartbeat = now(),
      attempt_count = attempt_count + 1,
      error_message = NULL
  FROM candidate
  WHERE a.id = candidate.id
  RETURNING a.* INTO v_action;

  IF v_action.id IS NOT NULL THEN
    INSERT INTO public.growth_agent_action_events(action_id, event_type, message, metadata)
    VALUES (v_action.id, 'claimed', 'Growth Agent worker claimed action', jsonb_build_object('worker_id', p_worker_id));
  END IF;

  RETURN v_action;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_growth_agent_action(
  p_action_id uuid,
  p_worker_id text,
  p_event jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_type text := coalesce(p_event->>'event_type', 'progress');
  v_message text := p_event->>'message';
  v_metadata jsonb := coalesce(p_event->'metadata', '{}'::jsonb);
BEGIN
  UPDATE public.growth_agent_actions
  SET last_heartbeat = now()
  WHERE id = p_action_id
    AND status = 'processing'
    AND locked_by = p_worker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'growth action % is not locked by worker %', p_action_id, p_worker_id;
  END IF;

  INSERT INTO public.growth_agent_action_events(action_id, event_type, message, metadata)
  VALUES (p_action_id, v_event_type, v_message, v_metadata || jsonb_build_object('worker_id', p_worker_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_growth_agent_action(
  p_action_id uuid,
  p_worker_id text,
  p_result jsonb DEFAULT '{}'::jsonb,
  p_result_markdown text DEFAULT NULL,
  p_proposed_actions jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF jsonb_typeof(coalesce(p_proposed_actions, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'proposed actions must be a json array';
  END IF;

  UPDATE public.growth_agent_actions
  SET status = 'completed',
      result = coalesce(p_result, '{}'::jsonb),
      result_markdown = p_result_markdown,
      proposed_actions = coalesce(p_proposed_actions, '[]'::jsonb),
      completed_at = now(),
      last_heartbeat = now(),
      locked_at = NULL,
      locked_by = NULL,
      error_message = NULL
  WHERE id = p_action_id
    AND status = 'processing'
    AND locked_by = p_worker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'growth action % is not locked by worker %', p_action_id, p_worker_id;
  END IF;

  INSERT INTO public.growth_agent_action_events(action_id, event_type, message, metadata)
  VALUES (p_action_id, 'completed', 'Growth Agent worker completed action', jsonb_build_object('worker_id', p_worker_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_growth_agent_action(
  p_action_id uuid,
  p_worker_id text,
  p_error_message text,
  p_retryable boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.growth_agent_actions
  SET status = CASE WHEN p_retryable AND attempt_count < 3 THEN 'queued' ELSE 'failed' END,
      error_message = left(coalesce(p_error_message, 'unknown error'), 2000),
      last_heartbeat = now(),
      locked_at = NULL,
      locked_by = NULL,
      completed_at = CASE WHEN p_retryable AND attempt_count < 3 THEN NULL ELSE now() END
  WHERE id = p_action_id
    AND status = 'processing'
    AND locked_by = p_worker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'growth action % is not locked by worker %', p_action_id, p_worker_id;
  END IF;

  INSERT INTO public.growth_agent_action_events(action_id, event_type, message, metadata)
  VALUES (
    p_action_id,
    'failed',
    left(coalesce(p_error_message, 'unknown error'), 2000),
    jsonb_build_object('worker_id', p_worker_id, 'retryable', p_retryable)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_growth_agent_action(text, text[], integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_growth_agent_action(uuid, text, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_growth_agent_action(uuid, text, jsonb, text, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_growth_agent_action(uuid, text, text, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_growth_agent_action(text, text[], integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_growth_agent_action(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_growth_agent_action(uuid, text, jsonb, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_growth_agent_action(uuid, text, text, boolean) TO service_role;

COMMENT ON TABLE public.growth_agent_actions IS 'Durable queue of safe Growth Agent draft/recommendation intents enqueued from the app.';
COMMENT ON COLUMN public.growth_agent_actions.approval_required IS 'Phase 1 is draft-only; side effects require a separate approval/apply flow.';
COMMENT ON TABLE public.growth_agent_action_events IS 'Append-only user-visible status and audit events for Growth Agent actions.';
