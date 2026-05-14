# Growth Agent Hermes worker MVP runbook

This worker is the private Hermes-side bridge for `growth_agent_actions`. It claims one safe draft-only queue row at a time through service-role RPCs, calls the local Hermes API Server `/v1/runs`, mirrors progress into `growth_agent_action_events`, and completes/fails the action row.

## Safety boundary

Phase 1 action types are draft-only:

- `growth_brief.generate`
- `outreach_draft.generate`
- `campaign_ideas.generate`
- `record_summary.generate`

The worker prompt explicitly forbids direct CRM/contact/billing/auth/application-table mutation, sends, webhooks, and bulk side effects. Side effects must be returned as `proposed_actions` for later approval.

## Required services

1. Supabase project with migration `supabase/migrations/20260513234500_growth_agent_actions.sql` applied.
2. Hermes API Server running on localhost/private network with bearer auth enabled.
3. A dedicated Hermes profile named `growth-agent` with restricted toolsets.

Recommended Hermes API server posture:

```bash
export API_SERVER_KEY='replace-with-long-random-secret'
hermes gateway setup   # enable/configure API Server if needed
hermes gateway run
```

Do not expose the API Server to browsers. If it must bind beyond localhost, use TLS, a reverse proxy, CORS allowlist, and the API key.

## Worker environment

```bash
export SUPABASE_URL='http://127.0.0.1:54321'
export SUPABASE_SERVICE_ROLE_KEY='service-role-key'
export API_SERVER_KEY='same-secret-used-by-hermes-api-server'

# Optional defaults shown here
export HERMES_API_BASE_URL='http://127.0.0.1:8000'
export HERMES_GROWTH_AGENT_PROFILE='growth-agent'
export HERMES_GROWTH_AGENT_TOOLSETS='terminal,file'
export GROWTH_AGENT_POLL_INTERVAL_MS='5000'
export GROWTH_AGENT_MAX_RUNTIME_MS='600000'
export GROWTH_AGENT_STALE_AFTER_SECONDS='900'
export GROWTH_AGENT_SAFE_ACTION_TYPES='growth_brief.generate,outreach_draft.generate,campaign_ideas.generate,record_summary.generate'
```

## Run locally

One-shot mode is best for local/dev verification:

```bash
GROWTH_AGENT_ONCE=1 npm run growth-agent:worker
```

Daemon/polling mode:

```bash
npm run growth-agent:worker
```

## Local safe draft-only smoke test

Insert a no-side-effect draft action as the authenticated user or with a local SQL console:

```sql
insert into public.growth_agent_actions (
  user_id,
  business_id,
  action_type,
  approval_required,
  idempotency_key,
  payload
) values (
  auth.uid(),
  '11111111-1111-4111-8111-111111111111',
  'growth_brief.generate',
  true,
  'local-smoke-1',
  '{"goal":"Test Growth Agent MVP","audience":"founders","offer":"private beta","context_snippets":["local smoke test"]}'::jsonb
);
```

Then run:

```bash
GROWTH_AGENT_ONCE=1 npm run growth-agent:worker
```

Expected result:

- `growth_agent_actions.status = 'completed'`
- `result_markdown` contains the draft brief
- `proposed_actions` is a JSON array
- `growth_agent_action_events` includes `claimed`, heartbeat/progress, and `completed`

## Stale lock and retries

`claim_next_growth_agent_action()` can reclaim `processing` rows whose `locked_at` is older than `GROWTH_AGENT_STALE_AFTER_SECONDS` (default 15 minutes). `fail_growth_agent_action()` requeues retryable failures until the third attempt, then marks the action `failed`.

## Tests

```bash
npm run growth-agent:worker:test
```

The tests use dependency injection for Supabase RPC and `fetch`, so they do not need real Supabase or Hermes credentials.

