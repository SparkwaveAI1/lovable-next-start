# SPA-899 Prospect Sequence Engine Fix — Deployment Runbook

**Status:** Code + Migrations Ready | Awaiting Backfill + Deploy Approval

## Overview
Fixes prospect-sequence-processor to handle blue_collar and fight_flow_b2b lead types, not just b2b_sparkwave. Enables Day 3/7/14 follow-ups for 3+ prospects currently stuck with missing sequences.

**Problem:** 3 blue_collar prospects received cold_email at Day 0 (2026-03-18) but were never enrolled (sequence_day=0 not set). Processor only handled b2b_sparkwave lead type, so they never got Day 3/7/14 follow-ups.

**Solution:** 
1. Backfill existing cold_emails with sequence_day=0
2. Extend processor to handle all ACTIVE_LEAD_TYPES
3. DB trigger for automatic Day 0 enrollment on new inserts
4. Centralized TEMPLATE_SETS (single source of truth)

## Deployment Steps

### Pre-Deployment Checks
```bash
# Verify all 12 templates exist in template system
scripts/check-templates.sh
```

**Expected output:**
```
[CHECK-TEMPLATES] ✓ iris-b2b-intro
[CHECK-TEMPLATES] ✓ iris-b2b-followup-day3
... (all 12)
[CHECK-TEMPLATES] ✅ All templates validated
```

**If check fails:** Verify the 12 templates are published to the template system before proceeding.

### Step 1: Backfill Existing Cold Emails (One-Time)

**This is a one-time backfill for historical data.** Run this SQL against production:

```sql
-- Backfill sequence_day=0 on ALL existing intro cold_emails
-- One-time operation to initialize Day 0 for prospects that missed it
-- The DB trigger (Part 3) handles all future inserts automatically

UPDATE outreach_log 
SET sequence_day=0 
WHERE type='cold_email' 
  AND template_used IN ('iris-seo-outreach', 'iris-b2b-intro', 'fight-flow-seo-intro')
  AND sequence_day IS NULL;
```

**Verification:**
```sql
SELECT COUNT(*) FROM outreach_log 
WHERE type='cold_email' 
  AND template_used IN ('iris-seo-outreach', 'iris-b2b-intro', 'fight-flow-seo-intro')
  AND sequence_day=0;
```

Expected: 3 rows updated (the Mar 18 cold_email sends)

### Step 2: Deploy Code Changes

```bash
# Verify code is ready
git log --oneline | head -5

# Should show:
# feat(sales): SPA-899 Phase 2 — Generate trigger migration
# feat(sales): SPA-899 Phase 1 — Prospect sequence engine fix
```

**Deploy to Supabase:** Push to origin/main and trigger Vercel deploy.

### Step 3: Apply DB Migration

Run the generated migration to create/update the trigger:

```bash
# The migration was auto-generated from template-sets.json
# File: supabase/migrations/20260321100703_coldmail_day0_trigger.sql

supabase migration up
# or manually execute the SQL from the migration file
```

**What it does:**
- Creates `enforce_coldmail_day0()` function
- Creates `coldmail_day0_trigger` on `outreach_log` table
- Automatically sets sequence_day=0 for any cold_email INSERT with an intro template

### Step 4: Restart Processor

```bash
# Restart the Edge Function to pick up new code
supabase functions deploy prospect-sequence-processor
```

## Verification

### Immediate (After deployment)
```sql
-- Check that backfilled rows have sequence_day=0
SELECT id, prospect_id, template_used, sequence_day, sent_at 
FROM outreach_log 
WHERE type='cold_email' 
  AND template_used IN ('iris-seo-outreach', 'iris-b2b-intro', 'fight-flow-seo-intro')
ORDER BY sent_at DESC
LIMIT 10;
```

Expected: All rows have sequence_day=0

### Day 3 Envelope Check (Mar 21 18:00 UTC)
Run the processor manually or wait for scheduled run:

```bash
# Check logs for processor activity
# Look for: "📧 Sending Day 3 follow-up to <prospect_email>"

supabase functions invoke prospect-sequence-processor
```

Expected: At least 1–3 Day 3 emails queued/sent for blue_collar prospects enrolled at Day 0

### Trigger Validation (Optional)
Insert a test cold_email to verify the trigger works:

```sql
INSERT INTO outreach_log 
  (prospect_id, type, template_used, sequence_day, status)
VALUES 
  (999, 'cold_email', 'iris-seo-outreach', NULL, 'sent')
RETURNING id, sequence_day;
```

Expected: sequence_day automatically set to 0

## Rollback Plan

If issues occur:

1. **Revert code deployment** — roll back to previous commit on main
2. **Drop trigger** (if needed):
   ```sql
   DROP TRIGGER IF EXISTS coldmail_day0_trigger ON outreach_log;
   DROP FUNCTION IF EXISTS enforce_coldmail_day0();
   ```
3. **Backfill revert** (if needed):
   ```sql
   UPDATE outreach_log 
   SET sequence_day=NULL 
   WHERE type='cold_email' 
     AND template_used IN ('iris-seo-outreach', 'iris-b2b-intro', 'fight-flow-seo-intro')
     AND sequence_day=0 
     AND sent_at >= '2026-03-18'::date;
   ```

## Files Modified/Created

| File | Purpose |
|------|---------|
| supabase/functions/lib/template-sets.json | Single source of truth for all templates |
| supabase/functions/prospect-sequence-processor/index.ts | Extended to handle all ACTIVE_LEAD_TYPES |
| scripts/generate-trigger-migration.js | Generates trigger migration from template-sets.json |
| scripts/check-templates.sh | CI pre-deployment validation gate |
| supabase/migrations/20260321100703_coldmail_day0_trigger.sql | DB trigger (auto-generated) |

## Notes

- **Template synchronization:** All intro template names in the backfill SQL, trigger, and CI check are automatically derived from TEMPLATE_SETS in template-sets.json. Changes to intro templates only need to be made in one place.
- **Error handling:** Processor now uses granular error handling (skip prospect/step, log WARNING, continue) instead of fail-fast.
- **Idempotent:** Backfill is safe to re-run; trigger is additive (INSERT-only).

## Related Issues
- SPA-881: Iris Sales Automation Phase 1 (blue_collar template set)
- SPA-899: Fix Prospect Sequence Engine Stall (this fix)
