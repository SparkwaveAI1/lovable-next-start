import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Prospect Lead Intake (SPA-881 Phase 1)
 *
 * Authenticated webhook called by BeReach or Iris when a new B2B prospect is ready for outreach.
 * Enrolls the prospect in the Day 0→3→7→14 email sequence.
 *
 * Auth: Bearer token (PROSPECT_INTAKE_SECRET env var)
 *
 * Request body:
 *   { prospect_id?: number }            — enroll existing prospect
 *   OR
 *   { name: string, email: string, company?: string }
 *                                       — create + enroll new prospect
 *   Optional: { force_reenroll?: boolean } — re-enroll sequence_complete prospects
 *
 * Idempotent: if prospect already has a sent sequence_day=0 entry, returns { status: 'already_enrolled' }
 *
 * Table: `prospects` (the B2B CRM table — id: integer)
 * NOT for Fight Flow contacts (contacts table).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sparkwave AI B2B sender info
const FROM_EMAIL = 'scott@sparkwave-ai.com';
const FROM_NAME = 'Scott Johnson';
const SPARKWAVE_BUSINESS_ID = '5a9bbfcf-fae5-4063-9780-bcbe366bae88';

// Terminal stages — prospects in these stages CANNOT be re-enrolled
const HARD_TERMINAL_STAGES = new Set(['replied', 'qualified', 'closed', 'dead', 'unsubscribed']);

// Day 0 initial outreach email template (placeholder — Scott to replace with final copy)
function buildInitialEmailHtml(prospect: { name?: string | null; company?: string | null; email: string }): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
      <p>Hi${prospect.name ? ` ${prospect.name}` : ''},</p>
      <p>I'm Scott Johnson, founder of Sparkwave AI. We build automation systems for B2B companies — connecting CRM, outreach, content, and AI workflows into one coordinated engine.</p>
      <p>${prospect.company ? `I came across ${prospect.company} and thought` : 'I thought'} you might be dealing with some of the same challenges our clients face: manual follow-up, fragmented tools, and leads that slip through the cracks.</p>
      <p>Would it be worth a 15-minute call to see if there's a fit? I can share what we've built and what's worked for similar companies.</p>
      <p>Best,<br>Scott<br>Sparkwave AI<br><a href="https://sparkwave-ai.com">sparkwave-ai.com</a></p>
      <p style="font-size:12px;color:#999;">To unsubscribe, reply with "unsubscribe".</p>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Auth check ────────────────────────────────────────────────────────────
  const intakeSecret = Deno.env.get('PROSPECT_INTAKE_SECRET');
  if (intakeSecret) {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token || token !== intakeSecret) {
      console.warn('⛔ Unauthorized prospect-lead-intake call — invalid/missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    // Secret not configured — log warning but allow (prevents lockout during initial deploy)
    console.warn('⚠️ PROSPECT_INTAKE_SECRET not set — endpoint is unprotected');
  }

  try {
    const body = await req.json();
    console.log('📥 prospect-lead-intake request:', JSON.stringify(body, null, 2));

    const forceReenroll = body.force_reenroll === true;

    let prospectId: number;
    let prospectEmail: string;
    let prospectName: string | null = null;
    let prospectCompany: string | null = null;
    let currentPipelineStage: string | null = null;

    // ── Find or create prospect ──────────────────────────────────────────────
    if (body.prospect_id) {
      // Enroll existing prospect
      const { data: existing, error: lookupErr } = await supabase
        .from('prospects')
        .select('id, name, email, company, pipeline_stage, status')
        .eq('id', body.prospect_id)
        .single();

      if (lookupErr || !existing) {
        return new Response(
          JSON.stringify({ error: `Prospect not found: ${body.prospect_id}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existing.email) {
        return new Response(
          JSON.stringify({ error: 'Prospect has no email address' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      prospectId = existing.id;
      prospectEmail = existing.email;
      prospectName = existing.name;
      prospectCompany = existing.company;
      currentPipelineStage = existing.pipeline_stage;

    } else if (body.email) {
      // Create or find prospect by email
      if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email address' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if prospect already exists by email
      const { data: existingByEmail } = await supabase
        .from('prospects')
        .select('id, name, email, company, pipeline_stage')
        .ilike('email', body.email.trim())
        .maybeSingle();

      if (existingByEmail) {
        console.log('📋 Found existing prospect by email:', existingByEmail.id);
        prospectId = existingByEmail.id;
        prospectEmail = existingByEmail.email;
        prospectName = existingByEmail.name || body.name || null;
        prospectCompany = existingByEmail.company || body.company || null;
        currentPipelineStage = existingByEmail.pipeline_stage;
      } else {
        // Create new prospect
        const { data: newProspect, error: createErr } = await supabase
          .from('prospects')
          .insert({
            email: body.email.trim().toLowerCase(),
            name: body.name || 'Unknown',
            company: body.company || null,
            pipeline_stage: 'contacted',
            status: 'active',
            source: 'bereach_intake',
          })
          .select('id, name, email, company, pipeline_stage')
          .single();

        if (createErr || !newProspect) {
          throw new Error(`Failed to create prospect: ${createErr?.message}`);
        }

        console.log('✅ Created new prospect:', newProspect.id, newProspect.email);
        prospectId = newProspect.id;
        prospectEmail = newProspect.email;
        prospectName = newProspect.name;
        prospectCompany = newProspect.company;
        currentPipelineStage = newProspect.pipeline_stage;
      }

    } else {
      return new Response(
        JSON.stringify({ error: 'Must provide prospect_id or email' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Block hard-terminal prospects ────────────────────────────────────────
    if (currentPipelineStage && HARD_TERMINAL_STAGES.has(currentPipelineStage)) {
      console.log(`⛔ Prospect ${prospectId} is in hard-terminal stage '${currentPipelineStage}' — cannot enroll`);
      return new Response(
        JSON.stringify({
          status: 'blocked',
          reason: `Prospect is in terminal stage '${currentPipelineStage}' — cannot re-enroll`,
          prospect_id: prospectId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Idempotency check ────────────────────────────────────────────────────
    const { data: existingDay0 } = await supabase
      .from('outreach_log')
      .select('id, status, sent_at')
      .eq('prospect_id', prospectId)
      .eq('sequence_day', 0)
      .maybeSingle();

    if (existingDay0?.status === 'sent' && !forceReenroll) {
      console.log(`⏭️ Prospect ${prospectId} already enrolled (Day 0 sent at ${existingDay0.sent_at})`);
      return new Response(
        JSON.stringify({
          status: 'already_enrolled',
          prospect_id: prospectId,
          outreach_log_id: existingDay0.id,
          enrolled_at: existingDay0.sent_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // force_reenroll: archive existing sequence entries
    if (existingDay0?.status === 'sent' && forceReenroll) {
      console.log(`🔄 Force re-enroll for prospect ${prospectId} — archiving existing sequence`);
      await supabase
        .from('outreach_log')
        .update({ status: 'superseded' })
        .eq('prospect_id', prospectId)
        .in('sequence_day', [0, 3, 7, 14]);
    }

    // ── Insert outreach_log entry (pending) FIRST ────────────────────────────
    let logEntryId: number;

    if (existingDay0 && existingDay0.status !== 'sent' && !forceReenroll) {
      // Reuse existing failed/pending entry
      logEntryId = existingDay0.id;
      await supabase
        .from('outreach_log')
        .update({ status: 'pending' })
        .eq('id', logEntryId);
      console.log('♻️ Retrying failed/pending Day 0 entry:', logEntryId);
    } else {
      const { data: newLog, error: logErr } = await supabase
        .from('outreach_log')
        .insert({
          prospect_id: prospectId,
          sequence_day: 0,
          status: 'pending',
          template_used: 'initial_outreach',
          type: 'email',
        })
        .select('id')
        .single();

      if (logErr || !newLog) {
        throw new Error(`Failed to create outreach_log entry: ${logErr?.message}`);
      }
      logEntryId = newLog.id;
    }

    // ── Update pipeline_stage AFTER log is claimed ───────────────────────────
    await supabase
      .from('prospects')
      .update({ pipeline_stage: 'contacted', status: 'active', updated_at: new Date().toISOString() })
      .eq('id', prospectId)
      .not('pipeline_stage', 'in', `(${[...HARD_TERMINAL_STAGES].map(s => `"${s}"`).join(',')})`);

    // ── Send initial email via send-email function ───────────────────────────
    try {
      const emailHtml = buildInitialEmailHtml({
        name: prospectName,
        company: prospectCompany,
        email: prospectEmail,
      });

      const firstName = prospectName ? prospectName.split(' ')[0] : null;
      const subject = firstName
        ? `Hi ${firstName}, quick note from Sparkwave AI`
        : 'Quick note from Sparkwave AI';

      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: prospectEmail,
          subject,
          html: emailHtml,
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

      // Update outreach_log to 'sent' with timestamp
      await supabase
        .from('outreach_log')
        .update({
          status: 'sent',
          sent_at: now,
          resend_message_id: resendMessageId,
          subject,
        })
        .eq('id', logEntryId);

      console.log(`✅ Initial email sent to ${prospectEmail}, resend_id: ${resendMessageId}`);

      // Log success to automation_logs
      await supabase.from('automation_logs').insert({
        business_id: SPARKWAVE_BUSINESS_ID,
        automation_type: 'prospect_intake_enrolled',
        status: 'success',
        processed_data: {
          prospect_id: prospectId,
          prospect_email: prospectEmail,
          outreach_log_id: logEntryId,
          resend_message_id: resendMessageId,
          force_reenroll: forceReenroll,
        },
      });

      return new Response(
        JSON.stringify({
          status: 'enrolled',
          prospect_id: prospectId,
          outreach_log_id: logEntryId,
          resend_message_id: resendMessageId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (sendError: any) {
      console.error('❌ Initial email send failed:', sendError);

      await supabase
        .from('outreach_log')
        .update({ status: 'failed' })
        .eq('id', logEntryId);

      await supabase.from('automation_logs').insert({
        business_id: SPARKWAVE_BUSINESS_ID,
        automation_type: 'prospect_intake_email_failed',
        status: 'error',
        error_message: sendError.message,
        processed_data: {
          prospect_id: prospectId,
          prospect_email: prospectEmail,
        },
      });

      return new Response(
        JSON.stringify({
          status: 'error',
          error: 'Failed to send initial email',
          detail: sendError.message,
          prospect_id: prospectId,
          outreach_log_id: logEntryId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('❌ prospect-lead-intake fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
