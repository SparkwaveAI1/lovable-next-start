import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Process Email Queue Edge Function
 *
 * Processes batches of queued emails for a campaign using Resend's batch API.
 * Designed to be called repeatedly until the queue is empty.
 *
 * Required Supabase Edge Function Secrets:
 * - RESEND_API_KEY: Your Resend API key
 *
 * Usage:
 * POST /functions/v1/process-email-queue
 * Body: { campaign_id: "uuid", batch_size?: 100 }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessQueueRequest {
  campaign_id: string;
  batch_size?: number;
}

interface QueueItem {
  queue_id: string;
  contact_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  subject: string;
  content_html: string;
  content_text: string | null;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  status: string;
}

interface QueueProgress {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  skipped: number;
  percent_complete: number;
}

// Resend's batch API limit
const MAX_BATCH_SIZE = 100;

// Rate limit tracking
let rateLimitHit = false;
let rateLimitResetAt: Date | null = null;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 process-email-queue started');

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    // Initialize Supabase with service role for queue operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const body: ProcessQueueRequest = await req.json();
    const { campaign_id, batch_size = MAX_BATCH_SIZE } = body;

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    const effectiveBatchSize = Math.min(batch_size, MAX_BATCH_SIZE);
    console.log(`📧 Processing campaign: ${campaign_id}, batch_size: ${effectiveBatchSize}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found:', campaignError);
      throw new Error('Campaign not found');
    }

    // Validate campaign status
    if (!['queued', 'sending'].includes(campaign.status)) {
      console.log(`⚠️ Campaign status is '${campaign.status}', expected 'queued' or 'sending'`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Campaign must be in 'queued' or 'sending' status, current: ${campaign.status}`,
          campaign_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update campaign status to 'sending' if still 'queued'
    if (campaign.status === 'queued') {
      await supabase
        .from('email_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign_id);
    }

    // Get batch of emails from queue
    const { data: queueItems, error: queueError } = await supabase
      .rpc('get_email_queue_batch', {
        p_campaign_id: campaign_id,
        p_batch_size: effectiveBatchSize
      });

    if (queueError) {
      console.error('❌ Error fetching queue batch:', queueError);
      throw new Error('Failed to fetch queue batch');
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('✅ No pending emails in queue');

      // Get final progress
      const { data: progress } = await supabase
        .rpc('get_queue_progress', { p_campaign_id: campaign_id });

      // Check if we should mark campaign as sent
      if (progress && progress.pending === 0 && progress.processing === 0) {
        await supabase
          .from('email_campaigns')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            total_sent: progress.sent,
          })
          .eq('id', campaign_id);

        console.log('✅ Campaign completed!');
      }

      return new Response(
        JSON.stringify({
          success: true,
          campaign_id,
          batch_processed: 0,
          queue_empty: true,
          progress: progress || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📧 Processing ${queueItems.length} emails`);

    // Prepare batch emails for Resend
    const batchEmails = queueItems.map((item: QueueItem) => {
      const personalizedSubject = personalizeContent(campaign.subject, item);
      const personalizedHtml = personalizeContent(
        addUnsubscribeFooter(campaign.content_html, item.contact_id, campaign_id),
        item
      );
      const personalizedText = campaign.content_text
        ? personalizeContent(campaign.content_text, item)
        : undefined;

      return {
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: [item.email],
        subject: personalizedSubject,
        html: personalizedHtml,
        text: personalizedText,
        reply_to: campaign.reply_to || undefined,
        headers: {
          'X-Campaign-Id': campaign_id,
          'X-Queue-Id': item.queue_id,
          'X-Contact-Id': item.contact_id,
        },
      };
    });

    // Send batch via Resend
    let batchResult;
    let rateLimited = false;

    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchEmails),
      });

      // Check for rate limiting
      if (response.status === 429) {
        rateLimited = true;
        const retryAfter = response.headers.get('Retry-After');
        console.warn(`⚠️ Rate limited! Retry after: ${retryAfter || 'unknown'} seconds`);

        // Mark all items back to pending for retry
        for (const item of queueItems) {
          await supabase.rpc('mark_queue_failed', {
            p_queue_id: item.queue_id,
            p_error_message: 'Rate limited - will retry',
            p_should_retry: true
          });
        }

        const { data: progress } = await supabase
          .rpc('get_queue_progress', { p_campaign_id: campaign_id });

        return new Response(
          JSON.stringify({
            success: false,
            campaign_id,
            error: 'rate_limited',
            retry_after: retryAfter ? parseInt(retryAfter) : 60,
            batch_processed: 0,
            progress: progress || null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      batchResult = await response.json();

      if (!response.ok) {
        console.error('❌ Resend batch API error:', batchResult);
        throw new Error(batchResult.message || 'Batch send failed');
      }

    } catch (fetchError: any) {
      console.error('❌ Fetch error:', fetchError);

      // Mark all items as failed with retry
      for (const item of queueItems) {
        await supabase.rpc('mark_queue_failed', {
          p_queue_id: item.queue_id,
          p_error_message: fetchError.message || 'Network error',
          p_should_retry: true
        });
      }

      throw fetchError;
    }

    // Process results
    // Resend batch API returns { data: [{ id: "..." }, { id: "..." }] }
    const results = batchResult.data || [];
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      const result = results[i];

      if (result && result.id) {
        // Success - mark as sent
        await supabase.rpc('mark_queue_sent', {
          p_queue_id: item.queue_id,
          p_resend_id: result.id
        });

        // Create email_sends record for tracking
        await supabase.from('email_sends').insert({
          campaign_id: campaign_id,
          contact_id: item.contact_id,
          resend_id: result.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        // Update contact's last activity
        await supabase.rpc('contact_touch', { p_contact_id: item.contact_id });

        sentCount++;
        console.log(`✅ Sent to ${item.email} (${result.id})`);
      } else {
        // Failed - check if we should retry
        const errorMsg = result?.error || 'Unknown error';
        const shouldRetry = !isPermamentError(errorMsg);

        await supabase.rpc('mark_queue_failed', {
          p_queue_id: item.queue_id,
          p_error_message: errorMsg,
          p_should_retry: shouldRetry
        });

        failedCount++;
        console.error(`❌ Failed to send to ${item.email}: ${errorMsg}`);
      }
    }

    // Update campaign stats
    await supabase
      .from('email_campaigns')
      .update({
        total_sent: supabase.sql`total_sent + ${sentCount}`,
      })
      .eq('id', campaign_id);

    // Get updated progress
    const { data: progress } = await supabase
      .rpc('get_queue_progress', { p_campaign_id: campaign_id });

    // Check if campaign is complete
    let campaignComplete = false;
    if (progress && progress.pending === 0 && progress.processing === 0) {
      await supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaign_id);

      campaignComplete = true;
      console.log('✅ Campaign completed!');
    }

    console.log(`📧 Batch complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        batch_processed: queueItems.length,
        sent: sentCount,
        failed: failedCount,
        queue_empty: campaignComplete,
        progress: progress || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Error in process-email-queue:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Replace personalization tokens in content
 */
function personalizeContent(content: string, item: QueueItem): string {
  const firstName = item.first_name || 'there';
  const lastName = item.last_name || '';
  const fullName = firstName + (lastName ? ' ' + lastName : '');

  return content
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{name\}\}/gi, fullName)
    .replace(/\{\{email\}\}/gi, item.email);
}

/**
 * Add unsubscribe footer to email HTML
 */
function addUnsubscribeFooter(html: string, contactId: string, campaignId: string): string {
  const unsubscribeUrl = `https://fightflowacademy.com/unsubscribe?cid=${contactId}&eid=${campaignId}`;

  const footer = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
  <p style="margin: 0 0 10px 0;">
    You received this email because you subscribed to updates from Fight Flow Academy.
  </p>
  <p style="margin: 0;">
    <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
    from these emails.
  </p>
</div>
`;

  // Try to insert before closing body tag, or append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return html + footer;
}

/**
 * Check if an error is permanent (should not retry)
 */
function isPermamentError(errorMessage: string): boolean {
  const permanentErrors = [
    'invalid email',
    'email not valid',
    'mailbox not found',
    'user unknown',
    'no such user',
    'does not exist',
    'rejected',
    'blocked',
    'blacklisted',
    'unsubscribed',
    'complained',
  ];

  const lowerError = errorMessage.toLowerCase();
  return permanentErrors.some(pe => lowerError.includes(pe));
}
