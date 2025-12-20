import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Send Email Edge Function
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
  // For single email
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  
  // For campaign sending
  campaign_id?: string;
  
  // For transactional emails
  template?: 'welcome' | 'password_reset' | 'notification';
  template_data?: Record<string, any>;
  business_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 send-email function started');

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SendEmailRequest = await req.json();
    console.log('📧 Request type:', body.campaign_id ? 'campaign' : 'single');

    // Campaign sending mode
    if (body.campaign_id) {
      return await sendCampaign(body.campaign_id, supabase, resendApiKey);
    }

    // Single email mode
    if (!body.to || !body.subject || !body.html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    const fromEmail = body.from_email || 'noreply@yourdomain.com';
    const fromName = body.from_name || 'Your Company';

    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [body.to],
      subject: body.subject,
      html: body.html,
      text: body.text,
      reply_to: body.reply_to,
    };

    console.log('📧 Sending single email to:', body.to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API error:', result);
      throw new Error(result.message || 'Failed to send email');
    }

    console.log('✅ Email sent successfully:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error in send-email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Send a campaign to all subscribers on the associated list
 */
async function sendCampaign(
  campaignId: string,
  supabase: any,
  resendApiKey: string
): Promise<Response> {
  console.log('📧 Starting campaign send:', campaignId);

  // Get campaign details
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

  if (!campaign.list_id) {
    throw new Error('Campaign has no associated list');
  }

  // Update campaign status to sending
  await supabase
    .from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);

  // Get all active subscribers from the list
  const { data: members, error: membersError } = await supabase
    .from('email_list_members')
    .select(`
      subscriber:email_subscribers(
        id,
        email,
        first_name,
        last_name,
        status
      )
    `)
    .eq('list_id', campaign.list_id);

  if (membersError) {
    throw new Error('Failed to fetch list members');
  }

  // Filter to only active subscribers
  const activeSubscribers = members
    .map((m: any) => m.subscriber)
    .filter((s: any) => s && s.status === 'active');

  console.log(`📧 Sending to ${activeSubscribers.length} subscribers`);

  // Update total recipients
  await supabase
    .from('email_campaigns')
    .update({ total_recipients: activeSubscribers.length })
    .eq('id', campaignId);

  let sentCount = 0;
  let errorCount = 0;

  // Send emails in batches of 10 to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < activeSubscribers.length; i += BATCH_SIZE) {
    const batch = activeSubscribers.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (subscriber: any) => {
      try {
        // Personalize content
        const personalizedHtml = personalizeContent(
          campaign.content_html,
          subscriber
        );
        const personalizedText = campaign.content_text 
          ? personalizeContent(campaign.content_text, subscriber)
          : undefined;

        // Create send record first
        const { data: sendRecord } = await supabase
          .from('email_sends')
          .insert({
            campaign_id: campaignId,
            subscriber_id: subscriber.id,
            status: 'pending',
          })
          .select('id')
          .single();

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${campaign.from_name} <${campaign.from_email}>`,
            to: [subscriber.email],
            subject: campaign.subject,
            html: personalizedHtml,
            text: personalizedText,
            reply_to: campaign.reply_to,
            headers: {
              'X-Campaign-Id': campaignId,
              'X-Send-Id': sendRecord?.id,
            },
          }),
        });

        const result = await response.json();

        if (response.ok) {
          // Update send record with success
          await supabase
            .from('email_sends')
            .update({
              resend_id: result.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', sendRecord?.id);

          sentCount++;
        } else {
          // Update send record with error
          await supabase
            .from('email_sends')
            .update({
              status: 'bounced',
              error_message: result.message || 'Send failed',
            })
            .eq('id', sendRecord?.id);

          errorCount++;
          console.error(`❌ Failed to send to ${subscriber.email}:`, result);
        }
      } catch (err: any) {
        errorCount++;
        console.error(`❌ Error sending to ${subscriber.email}:`, err);
      }
    }));

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < activeSubscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Update campaign with final stats
  await supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_sent: sentCount,
    })
    .eq('id', campaignId);

  console.log(`✅ Campaign sent: ${sentCount} delivered, ${errorCount} errors`);

  return new Response(
    JSON.stringify({
      success: true,
      campaign_id: campaignId,
      total_recipients: activeSubscribers.length,
      sent: sentCount,
      errors: errorCount,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * Replace personalization tokens in content
 */
function personalizeContent(content: string, subscriber: any): string {
  return content
    .replace(/{{first_name}}/gi, subscriber.first_name || 'there')
    .replace(/{{last_name}}/gi, subscriber.last_name || '')
    .replace(/{{email}}/gi, subscriber.email || '')
    .replace(/{{name}}/gi, 
      subscriber.first_name 
        ? `${subscriber.first_name}${subscriber.last_name ? ' ' + subscriber.last_name : ''}`
        : 'there'
    );
}
