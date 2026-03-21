import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import template sets (single source of truth)
import TEMPLATE_SETS from "../lib/template-sets.json" assert { type: "json" };

/**
 * Prospect Sequence Processor (SPA-881 Phase 1 / SPA-899 Fix)
 *
 * Automated follow-up processor for all outreach prospects.
 * Runs on a schedule (every 2 hours via Supabase pg_cron).
 *
 * Sends Day 3/7/14 follow-up emails based on time elapsed since Day 0 initial email.
 * Uses outreach_log.sequence_day to track which steps have been sent (idempotent).
 * Timing is anchored to outreach_log.sent_at of the Day 0 entry.
 *
 * Table: `prospects` (CRM — id: integer)
 * Lead types handled: b2b_sparkwave, blue_collar, fight_flow_b2b
 *
 * SPA-899 fix (2026-03-21):
 * - Extended from b2b_sparkwave-only to all active lead types
 * - Added blue_collar (SEO outreach) and fight_flow_b2b (MMA gym) template sets
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

// Active lead types to process (SPA-899: extended from b2b_sparkwave-only)
const ACTIVE_LEAD_TYPES = ['b2b_sparkwave', 'blue_collar', 'fight_flow_b2b'];

// Sparkwave AI B2B sender info
const FROM_EMAIL = 'scott@sparkwave-ai.com';
const FROM_NAME = 'Scott Johnson';
const SPARKWAVE_BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';

interface EmailTemplate {
  subject: string;
  html: (prospect: { name?: string | null; company?: string | null; email: string }) => string;
  templateUsed: string;
}

// Template sets keyed by lead_type, then by sequence day
// b2b_sparkwave: Sparkwave AI B2B SaaS pitch
// blue_collar: SEO services follow-up (local businesses)
// fight_flow_b2b: Fight Flow MMA gym management platform

type ProspectData = { name?: string | null; company?: string | null; email: string };

const TEMPLATES_BY_LEAD_TYPE: Record<string, Record<number, EmailTemplate>> = {
  // B2B Sparkwave — AI/automation pitch
  b2b_sparkwave: {
    3: {
      subject: 'Following up — Sparkwave AI',
      templateUsed: 'b2b_day3_followup',
      html: (p: ProspectData) => `
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
      templateUsed: 'b2b_day7_followup',
      html: (p: ProspectData) => `
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
      templateUsed: 'b2b_day14_followup',
      html: (p: ProspectData) => `
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
  },

  // Blue Collar — SEO audit/services follow-up
  blue_collar: {
    3: {
      subject: 'Following up on your free SEO audit — Sparkwave AI',
      templateUsed: 'blue_collar_day3_followup',
      html: (p: ProspectData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
          <p>Hi${p.name ? ` ${p.name}` : ''},</p>
          <p>Just wanted to follow up on the SEO audit offer I sent a few days ago for ${p.company ? p.company : 'your business'}.</p>
          <p>We specialize in helping local service businesses like yours show up when customers are searching for what you offer — without wasting money on ads that don't convert.</p>
          <p>The audit is free and takes about 20 minutes. Want me to send it over?</p>
          <p>Best,<br>Scott<br>Sparkwave AI — Local SEO & Marketing Automation</p>
          <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
        </div>
      `,
    },
    7: {
      subject: 'One quick question — ${p.company ?? "your business"}',
      templateUsed: 'blue_collar_day7_followup',
      html: (p: ProspectData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
          <p>Hi${p.name ? ` ${p.name}` : ''},</p>
          <p>Quick question: when someone in your area searches for the service you offer, do you come up in the top 3 results?</p>
          <p>For most local businesses, the answer is no — and that's costing them real customers every week.</p>
          <p>We've helped contractors, electricians, roofers, and other tradespeople get found online and generate consistent leads without depending on referrals.</p>
          <p>Worth a 15-minute call to see if we can do the same for ${p.company ? p.company : 'you'}?</p>
          <p>Best,<br>Scott<br>Sparkwave AI</p>
          <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
        </div>
      `,
    },
    14: {
      subject: 'Last one from me — Sparkwave AI',
      templateUsed: 'blue_collar_day14_followup',
      html: (p: ProspectData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
          <p>Hi${p.name ? ` ${p.name}` : ''},</p>
          <p>This is my last email — I don't want to clog your inbox.</p>
          <p>If growing ${p.company ? p.company : 'your business'} online isn't a priority right now, totally understand. I'll leave the door open.</p>
          <p>If timing changes, you can always <a href="https://sparkwave-ai.com/book">book a free call here</a>.</p>
          <p>Best,<br>Scott<br>Sparkwave AI</p>
          <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
        </div>
      `,
    },
  },

  // Fight Flow B2B — MMA gym management platform
  fight_flow_b2b: {
    3: {
      subject: 'Following up — Fight Flow for your gym',
      templateUsed: 'fightflow_day3_followup',
      html: (p: ProspectData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
          <p>Hi${p.name ? ` ${p.name}` : ''},</p>
          <p>Just following up on my note about Fight Flow — the SMS automation platform built specifically for martial arts academies.</p>
          <p>Most gyms we work with were struggling with:</p>
          <ul>
            <li>Leads that go cold before you can follow up</li>
            <li>Trial members who never convert to paid</li>
            <li>Members who drop off without warning</li>
          </ul>
          <p>Fight Flow handles all of it automatically — so you and your staff can focus on coaching, not chasing leads.</p>
          <p>Worth a quick call to see if it's a fit for ${p.company ? p.company : 'your gym'}?</p>
          <p>Best,<br>Scott<br>Fight Flow Academy</p>
          <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
        </div>
      `,
    },
    7: {
      subject: 'How many leads did ${p.company ?? "your gym"} lose this week?',
      templateUsed: 'fightflow_day7_followup',
      html: (p: ProspectData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
          <p>Hi${p.name ? ` ${p.name}` : ''},</p>
          <p>Here's a stat that usually gets gym owners' attention: the average martial arts academy loses 40–60% of its website leads because no one follows up within the first hour.</p>
          <p>Fight Flow sends an automatic SMS within 2 minutes of a new lead coming in — and then follows up with a proven sequence until they book a trial or opt out.</p>
          <p>One of our gym partners went from 8 trials/month to 31 in their first 90 days. Same ad spend.</p>
          <p>Happy to show you the exact system. Want to hop on a quick call this week?</p>
          <p>Best,<br>Scott<br>Fight Flow Academy</p>
          <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
        </div>
      `,
    },
    14: {
      subject: 'Last one — Fight Flow',
      templateUsed: 'fightflow_day14_followup',
      html: (p: ProspectData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
          <p>Hi${p.name ? ` ${p.name}` : ''},</p>
          <p>Last note from me — I know you're busy running ${p.company ? p.company : 'your gym'}.</p>
          <p>If growing your membership isn't the focus right now, no worries at all. I'll stop reaching out.</p>
          <p>If that changes, <a href="https://fightflowmma.com/demo">grab a demo here</a> — takes 20 minutes and you'll see exactly how it works.</p>
          <p>Best of luck,<br>Scott<br>Fight Flow Academy</p>
          <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
        </div>
      `,
    },
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

    // Find all active prospects not in any terminal stage
    // Filter by all ACTIVE_LEAD_TYPES (b2b_sparkwave, blue_collar, fight_flow_b2b)
    const { data: prospects, error: fetchError } = await supabase
      .from('prospects')
      .select('id, name, email, company, pipeline_stage, status, lead_type')
      .in('lead_type', ACTIVE_LEAD_TYPES)
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

          // SPA-899: Dynamic template lookup from TEMPLATE_SETS by lead_type and day
          const leadTypeTemplates = TEMPLATE_SETS[prospect.lead_type as keyof typeof TEMPLATE_SETS];
          if (!leadTypeTemplates) {
            console.warn(`⚠️  WARN: Unknown lead_type '${prospect.lead_type}' for prospect ${prospect.id}. Skipping.`);
            results.skipped++;
            break; // Skip this prospect entirely
          }

          const templateName = leadTypeTemplates[step.day as keyof typeof leadTypeTemplates];
          if (!templateName) {
            console.warn(`⚠️  WARN: No template for lead_type='${prospect.lead_type}' day ${step.day}. Skipping this step.`);
            continue; // Skip this step, try next one
          }

          // Get the template from TEMPLATES_BY_LEAD_TYPE (defined below)
          const template = TEMPLATES_BY_LEAD_TYPE[prospect.lead_type]?.[step.day];
          if (!template) {
            console.warn(`⚠️  WARN: Template not found for ${prospect.lead_type} day ${step.day}. Skipping step.`);
            continue; // Skip this step
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
