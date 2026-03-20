import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Prospect Sequence Processor (SPA-881 Phase 1)
 *
 * Automated follow-up processor for B2B sales prospects.
 * Runs on a schedule (every 2 hours via Supabase cron).
 *
 * Sends Day 3/7/14 follow-up emails based on time elapsed since Day 0 initial email.
 * Uses outreach_log.sequence_day to track which steps have been sent (idempotent).
 * Timing is anchored to outreach_log.sent_at of the Day 0 entry.
 *
 * Table: `prospects` (B2B CRM — id: integer)
 * NOT for Fight Flow contacts (contacts table).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sequence intervals (hours) — anchored to Day 0 sent_at timestamp
const SEQUENCE_STEPS = [
  { day: 3, hours: 72 },
  { day: 7, hours: 168 },
  { day: 14, hours: 336 },
];

// Terminal stages — NEVER send to prospects in these stages
const TERMINAL_STAGES = new Set([
  'replied',
  'qualified',
  'closed',
  'dead',
  'unsubscribed',
  'sequence_complete',
]);

// Batch limit per run (rate limit safety)
const BATCH_LIMIT = 50;

// Lead type for Iris B2B Sparkwave prospects — must match prospect-lead-intake
const IRIS_LEAD_TYPE = 'b2b_sparkwave';

// Sparkwave AI B2B sender info
const FROM_EMAIL = 'scott@sparkwave-ai.com';
const FROM_NAME = 'Scott Johnson';
const SPARKWAVE_BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';

interface EmailTemplate {
  subject: string;
  html: (prospect: { name?: string | null; company?: string | null; email: string }) => string;
  templateUsed: string;
}

// Phase 1 placeholder templates — Scott to replace with final copy
const TEMPLATES: Record<number, EmailTemplate> = {
  3: {
    subject: 'Following up — Sparkwave AI',
    templateUsed: 'day3_followup',
    html: (p) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <p>Hi${p.name ? ` ${p.name}` : ''},</p>
        <p>I wanted to follow up on my previous note about Sparkwave AI. We help B2B companies automate their sales and marketing workflows — saving hours of manual work every week.</p>
        <p>A few things we've helped clients achieve:</p>
        <ul>
          <li>Automated lead follow-up sequences (like this one!)</li>
          <li>AI-driven content creation and scheduling</li>
          <li>Unified CRM and outreach tracking</li>
        </ul>
        <p>Would it make sense to chat for 15 minutes to see if there's a fit?</p>
        <p>Best,<br>Scott<br>Sparkwave AI</p>
        <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
      </div>
    `,
  },
  7: {
    subject: 'Quick question for you — Sparkwave AI',
    templateUsed: 'day7_followup',
    html: (p) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <p>Hi${p.name ? ` ${p.name}` : ''},</p>
        <p>I've been thinking about ${p.company ? p.company : 'your team'} and wanted to share one more thing before I go quiet.</p>
        <p>One of our clients — a B2B SaaS company similar to yours — cut their lead response time from 4 hours to under 5 minutes using Sparkwave's automation. They now convert 3x more inbound leads.</p>
        <p>Would a quick call make sense this week? Happy to show you exactly how they did it.</p>
        <p>Best,<br>Scott<br>Sparkwave AI</p>
        <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
      </div>
    `,
  },
  14: {
    subject: 'Last note from me — Sparkwave AI',
    templateUsed: 'day14_followup',
    html: (p) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
        <p>Hi${p.name ? ` ${p.name}` : ''},</p>
        <p>I'll keep this short — this is my last note.</p>
        <p>If automating your B2B sales and marketing workflows isn't a priority right now, no worries at all. I'll leave the door open.</p>
        <p>If the timing ever changes, I'd love to reconnect. In the meantime, you can <a href="https://sparkwave-ai.com/book">book a call here</a> any time.</p>
        <p>Best of luck,<br>Scott<br>Sparkwave AI</p>
        <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
      </div>
    `,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const startTime = Date.now();
  const results = {
    prospectsChecked: 0,
    emailsSent: 0,
    sequencesCompleted: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    console.log('🚀 prospect-sequence-processor started');

    // Find active Iris B2B prospects not in any terminal stage
    // Filter by lead_type='b2b_sparkwave' to exclude Fight Flow / blue_collar prospects
    const { data: prospects, error: fetchError } = await supabase
      .from('prospects')
      .select('id, name, email, company, pipeline_stage, status')
      .eq('lead_type', IRIS_LEAD_TYPE)
      .not('pipeline_stage', 'in', `(${[...TERMINAL_STAGES].join(',')})`)
      .limit(BATCH_LIMIT);

    if (fetchError) {
      throw new Error(`Failed to fetch prospects: ${fetchError.message}`);
    }

    if (!prospects || prospects.length === 0) {
      console.log('✅ No active prospects to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No active prospects to process', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Processing ${prospects.length} active prospects`);

    for (const prospect of prospects) {
      results.prospectsChecked++;

      try {
        if (!prospect.email) {
          console.warn(`⚠️ Prospect ${prospect.id} has no email — skipping`);
          results.skipped++;
          continue;
        }

        // Get all outreach_log entries for this prospect with sequence_day set
        const { data: outreachHistory, error: historyError } = await supabase
          .from('outreach_log')
          .select('id, sequence_day, status, sent_at')
          .eq('prospect_id', prospect.id)
          .not('sequence_day', 'is', null)    // only sequence emails
          .neq('status', 'superseded')         // ignore archived re-enroll history
          .order('sequence_day', { ascending: true });

        if (historyError) {
          console.error(`Error fetching outreach history for ${prospect.id}:`, historyError);
          results.errors.push(`History fetch failed for prospect ${prospect.id}: ${historyError.message}`);
          continue;
        }

        // Find the Day 0 sent email — timing anchor
        const day0Entry = outreachHistory?.find(
          (row) => row.sequence_day === 0 && row.status === 'sent'
        );

        if (!day0Entry) {
          console.log(`⏭️ Prospect ${prospect.id} has no sent Day 0 — skipping (not enrolled)`);
          results.skipped++;
          continue;
        }

        // Build set of already-sent sequence days
        const sentDays = new Set(
          (outreachHistory || [])
            .filter((row) => row.status === 'sent')
            .map((row) => row.sequence_day)
        );

        // Calculate hours elapsed since Day 0 was sent (use sent_at)
        const day0SentAt = new Date(day0Entry.sent_at).getTime();
        const hoursElapsed = (Date.now() - day0SentAt) / (1000 * 60 * 60);

        console.log(
          `📊 Prospect ${prospect.id} (${prospect.email}): ${hoursElapsed.toFixed(1)}h since Day 0, sent days: [${[...sentDays].join(',')}]`
        );

        let sentThisRun = false;

        // Check each sequence step
        for (const step of SEQUENCE_STEPS) {
          if (sentDays.has(step.day)) continue;
          if (hoursElapsed < step.hours) continue;

          const template = TEMPLATES[step.day];
          if (!template) {
            console.error(`No template for day ${step.day}`);
            continue;
          }

          console.log(`📧 Sending Day ${step.day} follow-up to ${prospect.email}`);

          // Claim the log slot with 'pending' to prevent duplicate sends
          const { data: logEntry, error: logInsertError } = await supabase
            .from('outreach_log')
            .insert({
              prospect_id: prospect.id,
              sequence_day: step.day,
              status: 'pending',
              template_used: template.templateUsed,
              type: 'email',
              subject: template.subject,
            })
            .select('id')
            .single();

          if (logInsertError) {
            // Check if already exists (concurrent run protection)
            const { data: existingEntry } = await supabase
              .from('outreach_log')
              .select('id, status')
              .eq('prospect_id', prospect.id)
              .eq('sequence_day', step.day)
              .neq('status', 'superseded')
              .maybeSingle();

            if (existingEntry?.status === 'sent') {
              console.log(`⏭️ Day ${step.day} already sent (concurrent run?) for prospect ${prospect.id}`);
              sentDays.add(step.day);
              continue;
            }
            if (existingEntry?.status === 'pending') {
              console.log(`⏭️ Day ${step.day} already pending (concurrent run) for prospect ${prospect.id}`);
              continue;
            }
            console.error(`Failed to create outreach_log entry for Day ${step.day}:`, logInsertError);
            results.errors.push(`Log insert failed for prospect ${prospect.id} day ${step.day}: ${logInsertError.message}`);
            continue;
          }

          const logEntryId = logEntry.id;

          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: prospect.email,
                subject: template.subject,
                html: template.html({
                  name: prospect.name,
                  company: prospect.company,
                  email: prospect.email,
                }),
                from_email: FROM_EMAIL,
                from_name: FROM_NAME,
                business_id: SPARKWAVE_BUSINESS_ID,
                reply_to: `sparkwave+${SPARKWAVE_BUSINESS_ID}@reply.sparkwave-ai.com`,
              }),
            });

            if (!emailResponse.ok) {
              const errText = await emailResponse.text();
              throw new Error(`send-email failed (${emailResponse.status}): ${errText}`);
            }

            const emailResult = await emailResponse.json();
            const resendMessageId = emailResult.id || emailResult.resend_id || null;
            const now = new Date().toISOString();

            await supabase
              .from('outreach_log')
              .update({
                status: 'sent',
                sent_at: now,
                resend_message_id: resendMessageId,
              })
              .eq('id', logEntryId);

            console.log(`✅ Day ${step.day} sent to ${prospect.email}, resend_id: ${resendMessageId}`);
            results.emailsSent++;
            sentThisRun = true;
            sentDays.add(step.day);

            await supabase.from('automation_logs').insert({
              business_id: SPARKWAVE_BUSINESS_ID,
              automation_type: 'prospect_sequence_email_sent',
              status: 'success',
              processed_data: {
                prospect_id: prospect.id,
                prospect_email: prospect.email,
                sequence_day: step.day,
                resend_message_id: resendMessageId,
                hours_since_day0: Math.round(hoursElapsed),
              },
            });

          } catch (sendError: any) {
            console.error(`❌ Failed to send Day ${step.day} to ${prospect.email}:`, sendError);
            results.errors.push(`Send failed for prospect ${prospect.id} day ${step.day}: ${sendError.message}`);

            await supabase
              .from('outreach_log')
              .update({ status: 'failed' })
              .eq('id', logEntryId);

            await supabase.from('automation_logs').insert({
              business_id: SPARKWAVE_BUSINESS_ID,
              automation_type: 'prospect_sequence_email_failed',
              status: 'error',
              error_message: sendError.message,
              processed_data: {
                prospect_id: prospect.id,
                prospect_email: prospect.email,
                sequence_day: step.day,
              },
            });
          }

          // Only send one step per run per prospect
          break;
        }

        // Check if Day 14 sent and no reply → mark sequence_complete
        if (!sentThisRun && sentDays.has(14)) {
          const { data: currentProspect } = await supabase
            .from('prospects')
            .select('pipeline_stage')
            .eq('id', prospect.id)
            .single();

          const currentStage = currentProspect?.pipeline_stage || '';
          if (
            currentProspect &&
            !TERMINAL_STAGES.has(currentStage)
          ) {
            await supabase
              .from('prospects')
              .update({
                pipeline_stage: 'sequence_complete',
                updated_at: new Date().toISOString(),
              })
              .eq('id', prospect.id);

            console.log(`✅ Marked prospect ${prospect.id} as sequence_complete (Day 14 sent, no reply)`);
            results.sequencesCompleted++;
          }
        }

      } catch (prospectError: any) {
        console.error(`Error processing prospect ${prospect.id}:`, prospectError);
        results.errors.push(`Prospect ${prospect.id} error: ${prospectError.message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ prospect-sequence-processor complete in ${duration}ms`, results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.prospectsChecked} prospects, sent ${results.emailsSent} emails`,
        results,
        durationMs: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ prospect-sequence-processor fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, results }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
