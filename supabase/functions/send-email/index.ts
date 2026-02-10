import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRetry, EMAIL_RETRY_OPTIONS } from "../_shared/retry.ts";

/**
 * Send Email Edge Function (v2.0 - with retry logic)
 * 
 * Sends emails via Resend API. Supports both single emails and campaign batch sending.
 * 
 * Required Supabase Edge Function Secrets:
 * - RESEND_API_KEY: Your Resend API key
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  campaign_id?: string;
  template?: 'welcome' | 'password_reset' | 'notification';
  template_data?: Record<string, any>;
  business_id?: string;
  contact_id?: string;
  test_email?: string;
}

/**
 * Generate plus-addressed reply-to email for multi-tenant routing
 * Format: sparkwave+{business_id}@reply.sparkwave-ai.com
 */
function generatePlusAddressedReplyTo(businessId: string | undefined, existingReplyTo: string | undefined): string {
  // If no business ID, use base address (will default to Sparkwave in inbound)
  if (!businessId) {
    return existingReplyTo || 'sparkwave@reply.sparkwave-ai.com';
  }
  
  // Generate plus-addressed email for routing
  return `sparkwave+${businessId}@reply.sparkwave-ai.com`;
}

interface EmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  headers?: Record<string, string>;
}

// Send single email via Resend API with retry
async function sendViaResend(
  apiKey: string,
  payload: EmailPayload
): Promise<{ id: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || `Resend API error (${response.status})`);
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    console.log(`[${requestId}] send-email started`);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('Email service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SendEmailRequest = await req.json();
    console.log(`[${requestId}] Request type:`, body.test_email ? 'test' : body.campaign_id ? 'campaign' : 'single');

    // Test send mode
    if (body.test_email && body.campaign_id) {
      console.log(`[${requestId}] Test send to:`, body.test_email);
      
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', body.campaign_id)
        .single();

      if (campaignError || !campaign) {
        return new Response(
          JSON.stringify({ success: false, error: 'Campaign not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const personalizedSubject = personalizeContent(campaign.subject || 'Test Email', {
        first_name: 'Test', last_name: 'User', email: body.test_email
      });
      const personalizedHtml = personalizeContent(campaign.content_html || '', {
        first_name: 'Test', last_name: 'User', email: body.test_email
      });

      // Use plus-addressed reply-to for multi-tenant routing
      const testReplyTo = generatePlusAddressedReplyTo(campaign.business_id, campaign.reply_to);
      
      const result = await withRetry(
        () => sendViaResend(resendApiKey, {
          from: `${campaign.from_name || 'Test'} <${campaign.from_email || 'noreply@example.com'}>`,
          to: [body.test_email!],
          subject: `[TEST] ${personalizedSubject}`,
          html: personalizedHtml,
          reply_to: testReplyTo,
        }),
        EMAIL_RETRY_OPTIONS
      );

      console.log(`[${requestId}] Test email sent:`, result.id);
      return new Response(
        JSON.stringify({ success: true, message: `Test email sent to ${body.test_email}`, resend_id: result.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Campaign sending mode
    if (body.campaign_id) {
      return await sendCampaign(body.campaign_id, supabase, resendApiKey, requestId);
    }

    // Single email mode
    if (!body.to || !body.subject || !body.html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    const fromEmail = body.from_email || 'noreply@yourdomain.com';
    const fromName = body.from_name || 'Your Company';

    console.log(`[${requestId}] Sending to:`, body.to);

    // Use plus-addressed reply-to for multi-tenant routing
    const singleReplyTo = generatePlusAddressedReplyTo(body.business_id, body.reply_to);
    console.log(`[${requestId}] Using plus-addressed reply-to:`, singleReplyTo);

    const result = await withRetry(
      () => sendViaResend(resendApiKey, {
        from: `${fromName} <${fromEmail}>`,
        to: [body.to!],
        subject: body.subject!,
        html: body.html!,
        text: body.text,
        reply_to: singleReplyTo,
      }),
      EMAIL_RETRY_OPTIONS
    );

    console.log(`[${requestId}] Email sent:`, result.id);

    // Link to contact if provided
    if (body.contact_id) {
      await supabase.from('email_sends').insert({
        contact_id: body.contact_id,
        resend_id: result.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        campaign_id: null,
        subscriber_id: null,
      });

      await supabase.from('contacts').update({
        last_activity_date: new Date().toISOString(),
      }).eq('id', body.contact_id);

      console.log(`[${requestId}] Linked to contact:`, body.contact_id);
    }

    return new Response(
      JSON.stringify({ success: true, message_id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Send campaign to recipients with batching
 */
async function sendCampaign(
  campaignId: string,
  supabase: any,
  resendApiKey: string,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] Campaign send:`, campaignId);

  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'sent') {
    throw new Error('Campaign has already been sent');
  }

  if (campaign.status === 'sending') {
    throw new Error('Campaign is already being sent');
  }

  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

  try {
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_campaign_recipients', { p_campaign_id: campaignId });

    if (recipientsError) {
      throw new Error('Failed to fetch campaign recipients');
    }

    if (!recipients || recipients.length === 0) {
      await supabase.from('email_campaigns').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: 0,
        total_sent: 0,
      }).eq('id', campaignId);

      return new Response(
        JSON.stringify({
          success: true,
          campaign_id: campaignId,
          total_recipients: 0,
          sent: 0,
          errors: 0,
          message: 'No recipients matched the targeting criteria',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[${requestId}] Sending to ${recipients.length} contacts`);
    await supabase.from('email_campaigns').update({ total_recipients: recipients.length }).eq('id', campaignId);

    let sentCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (contact: any) => {
        try {
          const personalizedHtml = personalizeContent(campaign.content_html, contact);
          const personalizedText = campaign.content_text ? personalizeContent(campaign.content_text, contact) : undefined;
          const personalizedSubject = personalizeContent(campaign.subject, contact);

          const { data: sendRecord, error: sendRecordError } = await supabase
            .from('email_sends')
            .insert({ campaign_id: campaignId, contact_id: contact.contact_id, status: 'pending' })
            .select('id')
            .single();

          if (sendRecordError) {
            errorCount++;
            return;
          }

          // Use plus-addressed reply-to for multi-tenant routing
          const campaignReplyTo = generatePlusAddressedReplyTo(campaign.business_id, campaign.reply_to);
          
          // Use retry for each email send
          const result = await withRetry(
            () => sendViaResend(resendApiKey, {
              from: `${campaign.from_name} <${campaign.from_email}>`,
              to: [contact.email],
              subject: personalizedSubject,
              html: personalizedHtml,
              text: personalizedText,
              reply_to: campaignReplyTo,
              headers: {
                'X-Campaign-Id': campaignId,
                'X-Send-Id': sendRecord.id,
                'X-Contact-Id': contact.contact_id,
              },
            }),
            { ...EMAIL_RETRY_OPTIONS, maxAttempts: 2 } // Fewer retries in batch mode
          );

          await supabase.from('email_sends').update({
            resend_id: result.id,
            status: 'sent',
            sent_at: new Date().toISOString(),
          }).eq('id', sendRecord.id);

          await supabase.rpc('contact_touch', { p_contact_id: contact.contact_id });
          sentCount++;

        } catch (err: any) {
          errorCount++;
          console.error(`[${requestId}] Failed to send to ${contact.email}:`, err.message);
        }
      }));

      // Rate limit between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Log progress
      if (recipients.length > 100 && (i + BATCH_SIZE) % 100 === 0) {
        console.log(`[${requestId}] Progress: ${Math.min(i + BATCH_SIZE, recipients.length)}/${recipients.length}`);
      }
    }

    await supabase.from('email_campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_sent: sentCount,
    }).eq('id', campaignId);

    console.log(`[${requestId}] Campaign complete: ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaignId,
        total_recipients: recipients.length,
        sent: sentCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    await supabase.from('email_campaigns').update({ status: 'draft' }).eq('id', campaignId);
    throw error;
  }
}

/**
 * Replace personalization tokens
 */
function personalizeContent(content: string, contact: any): string {
  return content
    .replace(/\{\{first_name\}\}/gi, contact.first_name || 'there')
    .replace(/\{\{last_name\}\}/gi, contact.last_name || '')
    .replace(/\{\{email\}\}/gi, contact.email || '')
    .replace(/\{\{name\}\}/gi, 
      contact.first_name 
        ? `${contact.first_name}${contact.last_name ? ' ' + contact.last_name : ''}`
        : 'there'
    );
}
