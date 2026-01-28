# Deploying the Follow-Up System

This document describes how to activate the automated lead follow-up system.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Access to Supabase Dashboard
- Edge functions deployed

## Step 1: Run Migrations

The follow-up system requires 3 new migrations:

```bash
cd /path/to/sparkwave-automation
supabase db push
```

Or apply manually in Supabase Dashboard → SQL Editor:

1. `20260128213000_follow_up_system.sql` — Creates tables and default sequences
2. `20260128220000_follow_up_cron.sql` — Sets up hourly cron job
3. `20260128221000_missed_class_trigger.sql` — Auto-enrollment for missed classes

## Step 2: Deploy Edge Function

```bash
supabase functions deploy process-follow-ups
```

## Step 3: Verify Cron Job

Check that the cron job is active:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-follow-ups-job';
```

Should show a job scheduled for `15 * * * *` (minute 15 of every hour).

## How It Works

### Enrollment Triggers

| Event | Sequence | Source |
|-------|----------|--------|
| New SMS contact | new_lead | sms-webhook |
| New Wix form lead | new_lead | webhook-handler |
| Contact responds | *paused* | sms-webhook |
| Missed class booking | missed_class | DB trigger |

### Default Sequences (Fight Flow)

**new_lead:**
- Day 1: SMS — Friendly follow-up
- Day 3: Email — Trial class offer
- Day 7: SMS — Soft close, then mark complete

**missed_class:**
- +4 hours: SMS — "We missed you, reschedule?"
- Day 2: SMS — "What day works for you?"

### Processing

Every hour at minute :15, the `process-follow-ups` function:
1. Finds contacts with due follow-ups
2. Sends SMS or email (personalized with {{first_name}}, etc.)
3. Updates progress, schedules next step
4. Marks complete when sequence ends

## Customizing Sequences

Edit sequences and steps directly in Supabase:

```sql
-- View all sequences
SELECT * FROM follow_up_sequences;

-- View steps for a sequence
SELECT * FROM follow_up_steps WHERE sequence_id = 'your-sequence-id' ORDER BY step_order;

-- Add a new step
INSERT INTO follow_up_steps (sequence_id, step_order, delay_hours, channel, message_template)
VALUES ('your-sequence-id', 4, 336, 'sms', 'Hi {{first_name}}, checking in one more time...');
```

## Monitoring

Check follow-up activity in `automation_logs`:

```sql
SELECT * FROM automation_logs 
WHERE automation_type IN ('follow_up_sent', 'follow_up_enrollment')
ORDER BY created_at DESC 
LIMIT 20;
```

Check enrollment status:

```sql
SELECT 
  cf.status,
  cf.current_step,
  cf.next_step_due_at,
  c.first_name,
  c.phone,
  fs.name as sequence_name
FROM contact_follow_ups cf
JOIN contacts c ON c.id = cf.contact_id
JOIN follow_up_sequences fs ON fs.id = cf.sequence_id
WHERE cf.status = 'active'
ORDER BY cf.next_step_due_at;
```

## Troubleshooting

**Cron not running?**
- Check `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
- Verify pg_cron extension is enabled

**Messages not sending?**
- Check `automation_logs` for errors
- Verify contact has valid phone/email
- Verify contact hasn't opted out (sms_status, email_status)

**Contact not enrolled?**
- Check if sequence exists and is_active = true
- Check if contact is already enrolled (unique constraint)
