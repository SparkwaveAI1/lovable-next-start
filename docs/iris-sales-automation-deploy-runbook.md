# Iris Sales Automation Phase 1 — Deploy Runbook (SPA-881)

**Who:** Scott (needs SUPABASE_ACCESS_TOKEN) or Dev once token is provided  
**Status:** Code complete + schema-corrected (2026-03-20), pushed to origin/main — blocked on deployment

**Schema corrections (2026-03-20 18:xx UTC):**
- Fixed: `status` uses `'prospect'` not `'active'` (matches real DB values)
- Fixed: New prospects created with `lead_type = 'b2b_sparkwave'` to distinguish from Fight Flow / blue_collar leads
- Fixed: `prospect-sequence-processor` now filters by `lead_type = 'b2b_sparkwave'` (not `status = 'active'`) — prevents Fight Flow prospects from receiving Sparkwave B2B sequences
- Fixed: `.not('pipeline_stage', 'in', ...)` format corrected (no inner quotes around values — PostgREST format)

---

## Prerequisites

1. **Supabase Access Token** — required to deploy edge functions via CLI
   - Get from: https://supabase.com/dashboard/account/tokens
   - Set in env or pass to CLI

2. **Supabase CLI** (npx version works):
   ```bash
   npx supabase --version  # Should print version number
   ```

---

## Step 1: Apply DB Migration

**In Supabase Dashboard → SQL Editor, run:**

```sql
-- File: supabase/migrations/20260320000001_outreach_log_sequence_day.sql

ALTER TABLE outreach_log
  ADD COLUMN IF NOT EXISTS sequence_day INT;

CREATE INDEX IF NOT EXISTS idx_outreach_log_prospect_sequence
  ON outreach_log(prospect_id, sequence_day)
  WHERE sequence_day IS NOT NULL;

ALTER TABLE outreach_log
  ADD CONSTRAINT IF NOT EXISTS chk_outreach_log_sequence_day
  CHECK (sequence_day IS NULL OR sequence_day IN (0, 3, 7, 14));

COMMENT ON COLUMN outreach_log.sequence_day IS
  'Which day in the B2B prospect email sequence this entry represents (0=initial, 3=day3, 7=day7, 14=day14). NULL for non-sequence emails.';
```

**Verify:**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'outreach_log' AND column_name = 'sequence_day';
-- Should return: sequence_day | integer | YES
```

---

## Step 2: Deploy Edge Functions

```bash
cd /root/repos/sparkwave-automation

# Login with your access token
export SUPABASE_ACCESS_TOKEN="your_token_here"

# Deploy both functions
npx supabase functions deploy prospect-lead-intake --project-ref wrsoacujxcskydlzgopa
npx supabase functions deploy prospect-sequence-processor --project-ref wrsoacujxcskydlzgopa
```

---

## Step 3: Set Environment Secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

| Key | Value | Notes |
|-----|-------|-------|
| `PROSPECT_INTAKE_SECRET` | (generate a random 32-char token) | Bearer token for webhook auth |

**Or via CLI:**
```bash
npx supabase secrets set PROSPECT_INTAKE_SECRET="your_random_secret_here" --project-ref wrsoacujxcskydlzgopa
```

**Generate a good secret:**
```bash
openssl rand -hex 32
```

---

## Step 4: Set Up pg_cron for Sequence Processor

**In Supabase Dashboard → SQL Editor:**

```sql
-- Run prospect-sequence-processor every 2 hours
SELECT cron.schedule(
  'prospect-sequence-processor',
  '0 */2 * * *',
  $$
    SELECT net.http_post(
      url := 'https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/prospect-sequence-processor',
      headers := json_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type', 'application/json'
      )::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify it's scheduled
SELECT * FROM cron.job WHERE jobname = 'prospect-sequence-processor';
```

**Alternative (simpler) using existing cron setup:**
```sql
-- Check what cron jobs exist already
SELECT jobname, schedule, active FROM cron.job ORDER BY created_at DESC LIMIT 10;
```

---

## Step 5: Verify Deployment

### Test prospect-lead-intake:
```bash
curl -X POST \
  https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/prospect-lead-intake \
  -H "Authorization: Bearer YOUR_PROSPECT_INTAKE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "email": "test+iris@sparkwave-ai.com",
    "company": "Test Corp"
  }'
```

**Expected response:**
```json
{
  "status": "enrolled",
  "prospect_id": 123,
  "outreach_log_id": 456,
  "resend_message_id": "re_..."
}
```

### Verify in DB:
```sql
-- Check the prospect was created
SELECT id, email, name, pipeline_stage FROM prospects WHERE email ILIKE '%test+iris%';

-- Check outreach_log entry with sequence_day=0
SELECT ol.id, ol.status, ol.sequence_day, ol.sent_at, ol.resend_message_id
FROM outreach_log ol
JOIN prospects p ON ol.prospect_id = p.id
WHERE p.email ILIKE '%test+iris%';
```

### Test idempotency (same lead, second call should return 'already_enrolled'):
```bash
curl -X POST \
  https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/prospect-lead-intake \
  -H "Authorization: Bearer YOUR_PROSPECT_INTAKE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email": "test+iris@sparkwave-ai.com"}'
# Expected: { "status": "already_enrolled", ... }
```

---

## Step 6: Give Iris the Webhook Details

**Iris's webhook URL:**
```
https://wrsoacujxcskydlzgopa.supabase.co/functions/v1/prospect-lead-intake
```

**Auth header:**
```
Authorization: Bearer <PROSPECT_INTAKE_SECRET>
```

**Payload options:**
```json
// Option A: Create new prospect + enroll
{"name": "Jane Doe", "email": "jane@company.com", "company": "Acme Corp"}

// Option B: Enroll existing prospect by ID
{"prospect_id": 42}

// Option C: Force re-enroll (restart sequence from Day 0)
{"email": "jane@company.com", "force_reenroll": true}
```

---

## What Happens After Deploy

1. **BeReach/Iris** calls `prospect-lead-intake` when a new lead is ready
2. **Day 0 email** is sent immediately  
3. **pg_cron** runs `prospect-sequence-processor` every 2 hours
4. **Day 3** follow-up sends automatically at 72h mark
5. **Day 7** follow-up sends at 168h
6. **Day 14** final email sends at 336h → `pipeline_stage = 'sequence_complete'`
7. **Replies** already handled by `email-inbound` function (live) → creates Scott mc_task

---

## Rollback

If something breaks:
```bash
# Redeploy previous version from git
git -C /root/repos/sparkwave-automation revert df696bc --no-commit
npx supabase functions deploy prospect-lead-intake --project-ref wrsoacujxcskydlzgopa
npx supabase functions deploy prospect-sequence-processor --project-ref wrsoacujxcskydlzgopa
```

---

*Built by Dev, SPA-881, 2026-03-20*
